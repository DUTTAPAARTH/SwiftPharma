import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import HealthProfile from "../models/HealthProfile.js";
import ChatSession from "../models/ChatSession.js";
import Prescription from "../models/Prescription.js";
import VaultItem from "../models/VaultItem.js";
import { callAI } from "../services/aiService.js";
import { emitToUser } from "../socket.js";
import { CHAT_SOCKET_EVENTS } from "../utils/socketEvents.js";

const router = express.Router();

const parseList = (items = []) =>
  items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 20);

const chunkText = (text = "", maxChunkSize = 48) => {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const chunks = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChunkSize && current) {
      chunks.push(`${current} `);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
};

const toIso = (value) => {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toISOString().slice(0, 10);
};

const buildHealthContext = async (userId, sessionId) => {
  const [profile, recentSessions, activePrescriptions, vaultItems] = await Promise.all([
    HealthProfile.findOne({ userId }).lean(),
    ChatSession.find({ userId, isActive: false, summary: { $nin: [null, ""] }, _id: { $ne: sessionId } })
      .sort({ updatedAt: -1 })
      .limit(3)
      .select("summary updatedAt title")
      .lean(),
    Prescription.find({
      userId,
      status: { $in: ["approved", "partially_fulfilled", "fully_fulfilled"] },
      $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("medicines aiExtractedMedicines updatedAt")
      .populate({ path: "medicines.productId", select: "name" })
      .lean(),
    VaultItem.find({ userId })
      .sort({ addedAt: -1 })
      .limit(20)
      .select("productName quantity unit expiryDate")
      .lean(),
  ]);

  const activeRx = [];
  for (const rx of activePrescriptions) {
    const linkedMeds = parseList(
      (rx.medicines || []).map((med) => med?.productId?.name),
    );
    for (const med of linkedMeds) {
      activeRx.push(`${med} (last update ${toIso(rx.updatedAt)})`);
    }

    const extracted = parseList((rx.aiExtractedMedicines || []).map((med) => med?.name));
    for (const med of extracted) {
      activeRx.push(`${med} (last update ${toIso(rx.updatedAt)})`);
    }
  }

  const vaultMeds = parseList(
    vaultItems.map(
      (item) =>
        `${item.productName} x${Number(item.quantity || 0)} ${String(item.unit || "units")} (exp ${toIso(item.expiryDate)})`,
    ),
  );

  const mentionMemory = (profile?.memoryMentions || [])
    .filter((entry) => entry?.status === "confirmed")
    .slice(-20)
    .map((entry) => `${entry.text} (${entry.source})`);

  return {
    profile: {
      age: profile?.age ?? null,
      biologicalSex: profile?.biologicalSex || "",
      bloodGroup: profile?.bloodGroup || "",
      allergies: parseList(profile?.allergies || []),
      chronicConditions: parseList(profile?.chronicConditions || []),
      regularMedicines: parseList(profile?.regularMedicines || []),
      healthGoals: parseList(profile?.healthGoals || []),
      preferredLanguage: profile?.preferredLanguage || "English",
      preferredTone: profile?.preferredTone || "supportive",
      lifestyleNotes: profile?.lifestyleNotes || "",
      mentionMemory,
    },
    recentSummaries: recentSessions.map((session) => ({
      title: session.title,
      summary: session.summary,
      updatedAt: session.updatedAt,
    })),
    activePrescriptions: activeRx,
    activeVaultMedicines: vaultMeds,
  };
};

const buildSystemPrompt = (context) => {
  const profileBlock = JSON.stringify(context.profile || {}, null, 2);
  const summaryBlock = JSON.stringify(context.recentSummaries || [], null, 2);
  const prescriptionBlock = JSON.stringify(context.activePrescriptions || [], null, 2);
  const vaultBlock = JSON.stringify(context.activeVaultMedicines || [], null, 2);

  return [
    "You are SwiftPharma Personal Health AI Companion.",
    "ROLE:",
    "- Provide practical, empathetic health guidance using user's memory and medicine context.",
    "- Be clear about uncertainty and always suggest consulting licensed professionals for diagnosis or emergencies.",
    "- Never provide dosage changes for prescription medicines as final medical advice.",
    "",
    "RESPONSE STYLE:",
    "- Use plain language and concise bullet points.",
    "- Mention safety red flags when relevant.",
    "- Use user's preferred language and tone when possible.",
    "",
    "CONTEXT: HEALTH PROFILE",
    profileBlock,
    "",
    "CONTEXT: LAST 3 SESSION SUMMARIES",
    summaryBlock,
    "",
    "CONTEXT: ACTIVE PRESCRIPTION MEDICINES",
    prescriptionBlock,
    "",
    "CONTEXT: ACTIVE VAULT MEDICINES",
    vaultBlock,
    "",
    "SAFETY:",
    "- If user mentions severe symptoms, chest pain, breathing trouble, self-harm, stroke signs, or overdose, prioritize emergency escalation.",
    "- End responses with a short non-diagnostic disclaimer.",
  ].join("\n");
};

const emitSse = (res, payload) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const createFallbackReply = (userMessage) => {
  return [
    "I can help you reason through this safely.",
    `You said: \"${String(userMessage || "").trim()}\"`,
    "- Track your symptoms, duration, and any triggers.",
    "- Avoid changing prescribed doses without clinician guidance.",
    "- If symptoms are severe or worsening, seek urgent care now.",
    "",
    "This is supportive guidance, not a diagnosis.",
  ].join("\n");
};

const extractMentionsHeuristic = (text = "") => {
  const lower = String(text || "").toLowerCase();
  const dictionary = [
    "diabetes",
    "hypertension",
    "asthma",
    "thyroid",
    "pcos",
    "anxiety",
    "depression",
    "allergy",
    "migraine",
    "cholesterol",
  ];

  return dictionary.filter((term) => lower.includes(term));
};

const extractMentionsWithLlama = async (text) => {
  if (!text) return [];

  try {
    const systemPrompt =
      "Extract explicit personal health mentions from the user text. Return strict JSON only in shape: {\"mentions\": [\"...\"]}. Include illnesses, allergies, chronic symptoms, or long-term medicine names only.";
    const ai = await callAI(systemPrompt, text);
    const content = String(ai?.answer || "{}");
    const parsed = JSON.parse(content || "{}");
    return parseList(parsed?.mentions || []);
  } catch {
    return [];
  }
};

const upsertMentionMemory = async ({ userId, sessionId, mentions = [] }) => {
  if (!mentions.length) return [];

  const profile = await HealthProfile.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const indexByText = new Map(
    (profile.memoryMentions || []).map((entry) => [
      String(entry.text || "").toLowerCase(),
      entry,
    ]),
  );

  const inserted = [];
  for (const mentionText of mentions) {
    const key = mentionText.toLowerCase();
    const existing = indexByText.get(key);

    if (existing) {
      existing.lastSeenAt = new Date();
      existing.seenCount = Number(existing.seenCount || 1) + 1;
      existing.confidence = Math.max(Number(existing.confidence || 0.6), 0.7);
      continue;
    }

    profile.memoryMentions.push({
      text: mentionText,
      source: "chat",
      status: "pending",
      confidence: 0.7,
      relatedSessionId: sessionId || null,
    });
    inserted.push(mentionText);
  }

  await profile.save();
  return inserted;
};

const extractMentionsAndNotify = async ({ userId, sessionId, userMessage, assistantReply }) => {
  const combinedText = `${String(userMessage || "")}\n${String(assistantReply || "")}`;
  const heuristic = extractMentionsHeuristic(combinedText);
  const llmMentions = await extractMentionsWithLlama(combinedText);
  const mentions = parseList([...heuristic, ...llmMentions]);

  if (!mentions.length) return;

  const insertedMentions = await upsertMentionMemory({
    userId,
    sessionId,
    mentions,
  });

  if (!insertedMentions.length) return;

  emitToUser(String(userId), CHAT_SOCKET_EVENTS.HEALTH_MENTION_FOUND, {
    sessionId,
    mentions: insertedMentions,
    detectedAt: new Date().toISOString(),
  });
};

router.use(authenticate);

router.get("/sessions", async (req, res) => {
  try {
    const userId = req.user?._id;
    const activeOnly = String(req.query?.active || "").toLowerCase() === "true";

    const query = { userId };
    if (activeOnly) {
      query.isActive = true;
    }

    const sessions = await ChatSession.find(query)
      .sort({ updatedAt: -1 })
      .limit(activeOnly ? 10 : 50)
      .select("title isActive summary startedAt endedAt updatedAt")
      .lean();

    return res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat sessions",
      error: error.message,
    });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const userId = req.user?._id;
    const title = String(req.body?.title || "").trim() || "New Health Chat";

    const session = await ChatSession.create({ userId, title, isActive: true });

    return res.status(201).json({
      success: true,
      session,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create session",
      error: error.message,
    });
  }
});

router.get("/sessions/:sessionId", async (req, res) => {
  try {
    const userId = req.user?._id;
    const { sessionId } = req.params;

    const session = await ChatSession.findOne({ _id: sessionId, userId }).lean();
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    return res.json({
      success: true,
      session,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch session",
      error: error.message,
    });
  }
});

router.post("/sessions/:sessionId/message", async (req, res) => {
  const userId = req.user?._id;
  const { sessionId } = req.params;
  const userMessage = String(req.body?.message || "").trim();

  if (!userMessage) {
    return res.status(400).json({
      success: false,
      message: "message is required",
    });
  }

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: "sessionId is required",
    });
  }

  try {
    const session = await ChatSession.findOne({ _id: sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Active session not found",
      });
    }

    const healthContext = await buildHealthContext(userId, session._id);
    const systemPrompt = buildSystemPrompt(healthContext);

    const contextSnapshot = JSON.stringify(
      {
        profile: healthContext.profile,
        activePrescriptions: healthContext.activePrescriptions.slice(0, 8),
        activeVaultMedicines: healthContext.activeVaultMedicines.slice(0, 8),
      },
      null,
      0,
    );

    session.messages.push({
      role: "user",
      content: userMessage,
      contextSnapshot,
      createdAt: new Date(),
    });

    if (
      session.title === "New Health Chat" &&
      session.messages.filter((item) => item.role === "user").length === 1
    ) {
      session.title = userMessage.slice(0, 64);
    }

    await session.save();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    const conversationMessages = session.messages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .slice(-20)
      .map((msg) => `${String(msg.role || "").toUpperCase()}: ${msg.content}`)
      .join("\n\n");

    let assistantReply = "";

    const llmPrompt = [
      "Conversation so far (latest first relevance):",
      conversationMessages,
      "",
      "Latest user message:",
      userMessage,
    ].join("\n");

    const ai = await callAI(systemPrompt, llmPrompt);
    assistantReply = String(ai?.answer || "").trim();

    if (assistantReply) {
      for (const token of chunkText(assistantReply)) {
        if (closed) break;
        emitSse(res, { type: "token", token });
      }
    }

    if (!assistantReply.trim()) {
      assistantReply = createFallbackReply(userMessage);
      if (!closed) {
        emitSse(res, { type: "token", token: assistantReply });
      }
    }

    const savedSession = await ChatSession.findById(session._id);
    if (savedSession) {
      savedSession.messages.push({
        role: "assistant",
        content: assistantReply,
        contextSnapshot,
        createdAt: new Date(),
      });
      await savedSession.save();
    }

    emitSse(res, {
      type: "done",
      sessionId: session._id,
      completedAt: new Date().toISOString(),
    });

    res.end();

    // Fire-and-forget mention extraction for persistent memory updates.
    extractMentionsAndNotify({
      userId,
      sessionId: session._id,
      userMessage,
      assistantReply,
    }).catch((error) => {
      console.warn("[chat] mention extraction failed", error.message);
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to process chat message",
        error: error.message,
      });
    }

    emitSse(res, {
      type: "error",
      message: "Failed to process message stream",
    });
    return res.end();
  }
});

router.post("/sessions/:sessionId/end", async (req, res) => {
  try {
    const userId = req.user?._id;
    const { sessionId } = req.params;

    const session = await ChatSession.findOne({ _id: sessionId, userId, isActive: true });
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Active session not found",
      });
    }

    const transcript = session.messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-30)
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n\n");

    let summary = "";
    if (transcript) {
      try {
        const ai = await callAI(
          "Create a compact session summary for future context. Include: main concerns, medicines mentioned, follow-up actions, and warning signs discussed. Keep it under 150 words.",
          transcript,
        );
        summary = String(ai?.answer || "").trim();
      } catch {
        summary = "Session ended. Summary generation unavailable for this session.";
      }
    }

    if (!summary) {
      summary = "Session ended. Discussed health concerns and follow-up safety guidance.";
    }

    session.summary = summary;
    session.summaryGeneratedAt = new Date();
    session.isActive = false;
    session.endedAt = new Date();
    await session.save();

    emitToUser(String(userId), CHAT_SOCKET_EVENTS.SESSION_SUMMARY_READY, {
      sessionId: session._id,
      summary,
      generatedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      session,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to end session",
      error: error.message,
    });
  }
});

export default router;
