import {
  checkInteractions,
  searchDrug,
  searchGuidelines,
  searchLiterature,
} from "../utils/medicalMCP.js";
import { callAI } from "../services/aiService.js";
import ChatHistory from "../models/ChatHistory.js";

const MCP_TIMEOUT_MS = 5000;
const RESPONSE_CACHE_TTL_MS = 10 * 60 * 1000;
const USER_COOLDOWN_MS = 3000;

const responseCache = new Map();
const userLastCallAt = new Map();
const userLastResponse = new Map();
const userPendingResponse = new Map();

const debugEnabled =
  String(process.env.ASSISTANT_DEBUG || "").toLowerCase() === "true" ||
  process.env.NODE_ENV !== "production";

const debugLog = (...args) => {
  if (!debugEnabled) return;
  console.log("[assistant-controller]", ...args);
};

const BASIC_SYSTEM_PROMPT = `You are a helpful medical assistant for SwiftPharma, an Indian pharmacy app.
Answer only medicine-related questions clearly and safely.
Always recommend consulting a licensed pharmacist or doctor for serious concerns.
Never suggest illegal or dangerous advice.
Keep answers concise, friendly, and in simple English unless another language is specified in the user context.`;

const MEDICAL_SYSTEM_PROMPT_TEMPLATE = `You are a helpful medical assistant for SwiftPharma, an Indian pharmacy app.
Answer only medicine-related questions clearly and safely.
Always recommend consulting a licensed pharmacist or doctor for serious concerns.

Use the following verified medical context to answer:

DRUG INFORMATION (FDA/RxNorm):
{{DRUG_INFO}}

MEDICAL LITERATURE (PubMed):
{{LITERATURE}}

CLINICAL GUIDELINES:
{{GUIDELINES}}

DRUG INTERACTIONS:
{{INTERACTIONS}}

If the medical context above does not contain relevant information, answer from your general medical knowledge but clearly state it is general information.

Keep answers concise, friendly, and in simple English unless another language is specified in the user context.
Never suggest illegal or dangerous advice.`;

const hasGuidelineIntent = (question) =>
  /\b(guideline|recommend|protocol|treatment|manage)\b/i.test(
    String(question || ""),
  );

const MEDICAL_KEYWORDS_REGEX =
  /\b(medicine|medication|drug|tablet|capsule|dose|dosage|prescription|side effect|interaction|symptom|health|disease|treatment|pain|fever|infection|diabetes|bp|blood pressure|pregnan|breastfeed|antibiotic|paracetamol|ibuprofen|aspirin|metformin|azithromycin|amoxicillin|atorvastatin|amlodipine|losartan|levothyroxine|omeprazole)\b/i;

const BLOCKED_PATTERNS = [
  {
    regex: /\b(suicide|kill myself|overdose|end my life|self harm)\b/i,
    reason: "self-harm-risk",
  },
  {
    regex: /\b(heroin|cocaine|meth|fentanyl|how to make drugs)\b/i,
    reason: "illegal-drugs",
  },
  {
    regex: /\b(maximum lethal|fatal dose|how much to die)\b/i,
    reason: "dangerous-dosage-seeking",
  },
];

const isSafeQuestion = (question) => {
  const text = String(question || "");
  for (const rule of BLOCKED_PATTERNS) {
    if (rule.regex.test(text)) {
      return { safe: false, reason: rule.reason };
    }
  }
  return { safe: true };
};

const hasMedicalKeywords = (question) =>
  MEDICAL_KEYWORDS_REGEX.test(String(question || ""));

const getFollowUpMedicineName = (medicineName, question) => {
  const normalized = String(medicineName || "").trim();
  if (normalized) return normalized;

  const fallbackFromQuestion =
    String(question || "")
      .match(/\b([A-Za-z][A-Za-z0-9\-]{2,})\b/g)
      ?.find((token) => MEDICAL_KEYWORDS_REGEX.test(token)) || "your medicine";

  return fallbackFromQuestion;
};

const generateFollowUps = (medicineName, question) => {
  const name = getFollowUpMedicineName(medicineName, question);
  const text = String(question || "").toLowerCase();

  if (/side\s*effect|adverse|reaction/.test(text)) {
    return [
      "What should I do if I experience side effects?",
      `Are there safer alternatives to ${name}?`,
      `Can I take ${name} with food?`,
    ];
  }

  if (/dosage|dose|how much|how often|mg\b|tablet\b|capsule\b/.test(text)) {
    return [
      `What happens if I miss a dose of ${name}?`,
      "Can I take a double dose to make up for missed one?",
      `How long should I take ${name}?`,
    ];
  }

  if (/interaction|interact|together|combine|with\s+other/.test(text)) {
    return [
      "What medicines are safe to take together?",
      "Should I tell my doctor about this interaction?",
      "Are there alternative medicines with fewer interactions?",
    ];
  }

  if (/pregnan|trimester|breastfeed|lactation/.test(text)) {
    return [
      `Is ${name} safe while breastfeeding?`,
      "What trimester is safest to take this medicine?",
      "What are pregnancy-safe alternatives?",
    ];
  }

  return [
    `What are the side effects of ${name}?`,
    `How should I store ${name}?`,
    `Can I take ${name} long term?`,
  ];
};

const wordCount = (text) =>
  String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const toList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const formatList = (input, fallback = "Not available") => {
  const list = Array.isArray(input)
    ? input
    : String(input || "")
        .split(/[.;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);

  return list.length ? list : [fallback];
};

const makeCacheKey = ({ question, medicineName }) =>
  `${String(question || "")
    .trim()
    .toLowerCase()}::${String(medicineName || "")
    .trim()
    .toLowerCase()}`;

const getCachedResponse = (key) => {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return hit.payload;
};

const setCachedResponse = (key, payload) => {
  responseCache.set(key, {
    payload,
    expiresAt: Date.now() + RESPONSE_CACHE_TTL_MS,
  });
};

const withTimeout = async (fn, timeoutMs, label) =>
  Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);

const detectMedicineName = (providedMedicineName, question) => {
  const direct = String(providedMedicineName || "").trim();
  if (direct) {
    return { medicineName: direct, confident: true };
  }

  const knownRegex =
    /\b(paracetamol|acetaminophen|ibuprofen|aspirin|diclofenac|metformin|azithromycin|amoxicillin|atorvastatin|amlodipine|losartan|levothyroxine|omeprazole)\b/i;
  const match = String(question || "").match(knownRegex);

  if (match?.[1]) {
    return { medicineName: match[1], confident: true };
  }

  return { medicineName: "", confident: false };
};

const formatDrugContext = (drugData) => {
  if (!drugData?.primary && !drugData?.results?.length) {
    return "No validated FDA/RxNorm data found.";
  }

  const primary = drugData.primary || drugData.results?.[0] || {};
  const brandNames =
    toList(primary.brandNames).slice(0, 5).join(", ") || "Not available";

  return [
    `Generic Name: ${primary.genericName || "Not available"}`,
    `Brand Names: ${brandNames}`,
    `Manufacturer: ${primary.manufacturer || "Not available"}`,
    `Indications: ${formatList(primary.indications).slice(0, 3).join("; ")}`,
    `Side Effects: ${formatList(primary.sideEffects).slice(0, 3).join("; ")}`,
    `Contraindications: ${formatList(primary.contraindications).slice(0, 3).join("; ")}`,
    `Warnings: ${formatList(primary.warnings).slice(0, 2).join("; ")}`,
  ].join("\n");
};

const formatLiteratureContext = (literature) => {
  const entries = toList(literature).slice(0, 3);
  if (!entries.length) return "No PubMed literature retrieved.";

  return entries
    .map((article, index) => {
      const title = article.title || "Untitled Article";
      const summary = article.abstract || "No abstract available.";
      const pmid = article.pmid ? `PMID ${article.pmid}` : "PMID unavailable";
      return `${index + 1}. ${title} (${pmid})\n   ${summary}`;
    })
    .join("\n");
};

const formatGuidelinesContext = (guidelines) => {
  const entries = toList(guidelines).slice(0, 2);
  if (!entries.length) return "No clinical guidelines retrieved.";

  return entries
    .map((item, index) => {
      const title = item.title || "Clinical Guideline";
      const org = item.organization ? ` - ${item.organization}` : "";
      const summary = item.summary || "No summary available.";
      return `${index + 1}. ${title}${org}\n   ${summary}`;
    })
    .join("\n");
};

const formatInteractionsContext = (warnings) => {
  const entries = toList(warnings);
  if (!entries.length) {
    return "No interaction warnings found for provided medicines.";
  }

  return entries
    .map((warning, index) => {
      const meds = toList(warning.medicines).join(" + ") || "Unknown medicines";
      const severity = String(warning.severity || "mild").toUpperCase();
      return `${index + 1}. ${meds} [${severity}]\n   ${warning.description || "Potential interaction."}\n   Recommendation: ${warning.recommendation || "Consult your pharmacist before combining."}`;
    })
    .join("\n");
};

const hasAnyEvidence = ({ drugData, literature, guidelines, interactions }) => {
  const hasDrug = Boolean(
    drugData?.primary || toList(drugData?.results).length,
  );
  const hasLiterature = toList(literature).length > 0;
  const hasGuidelines = toList(guidelines).length > 0;
  const hasInteractions = toList(interactions).length > 0;
  return hasDrug || hasLiterature || hasGuidelines || hasInteractions;
};

const buildPrompt = ({ question, medicineName, context, evidenceText }) => {
  const parts = [evidenceText || BASIC_SYSTEM_PROMPT, ""];

  if (medicineName) {
    parts.push(`Medicine being asked about: ${medicineName}`);
  }

  if (Array.isArray(context.otherMedicines) && context.otherMedicines.length) {
    parts.push(
      `Other medicines the patient is taking: ${context.otherMedicines.join(", ")}`,
    );
  }

  if (context.ageGroup && context.ageGroup !== "adult") {
    parts.push(`Patient age group: ${context.ageGroup}`);
  }

  if (
    context.language &&
    String(context.language).toLowerCase() !== "english"
  ) {
    parts.push(`Respond in: ${context.language}`);
  }

  parts.push("", `Patient question: ${question}`);
  return parts.join("\n");
};

const buildSources = ({ drugData, literature, guidelines }) => {
  const sources = [];

  if (drugData?.primary || toList(drugData?.results).length) {
    sources.push({ label: "FDA", type: "fda", url: null });
  }

  toList(literature)
    .slice(0, 3)
    .forEach((article) => {
      const title = article.title || "Article";
      const url =
        article.url ||
        (article.pmid
          ? `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`
          : null);
      sources.push({ label: `PubMed: ${title}`, type: "pubmed", url });
    });

  toList(guidelines)
    .slice(0, 2)
    .forEach((item) => {
      sources.push({
        label: item.organization
          ? `${item.organization} Guidelines`
          : item.title || "Clinical Guidelines",
        type: "guideline",
        url: item.url || null,
      });
    });

  return sources;
};

const buildMcpOnlySummary = ({ drugData, guidelines }) => {
  const parts = [];
  const drug = formatDrugContext(drugData);
  const guide = formatGuidelinesContext(guidelines);

  if (drug && !drug.includes("No validated FDA/RxNorm data found")) {
    parts.push(drug);
  }

  if (guide && !guide.includes("No clinical guidelines retrieved")) {
    parts.push(guide);
  }

  return parts.join("\n\n").trim() || null;
};

const pickMcpTasks = ({
  medicineName,
  medicineConfident,
  question,
  otherMedicines,
}) => {
  const tasks = [];

  if (medicineName && medicineConfident) {
    tasks.push({
      key: "drugData",
      run: () =>
        withTimeout(
          () => searchDrug(medicineName, 3),
          MCP_TIMEOUT_MS,
          "searchDrug",
        ),
    });
  }

  if (wordCount(question) > 10) {
    tasks.push({
      key: "literature",
      run: () =>
        withTimeout(
          () => searchLiterature(question, 3),
          MCP_TIMEOUT_MS,
          "searchLiterature",
        ),
    });
  }

  if (hasGuidelineIntent(question)) {
    tasks.push({
      key: "guidelines",
      run: () =>
        withTimeout(
          () => searchGuidelines(question, undefined, 2),
          MCP_TIMEOUT_MS,
          "searchGuidelines",
        ),
    });
  }

  if (otherMedicines.length >= 2) {
    tasks.push({
      key: "interactions",
      run: () =>
        withTimeout(
          () => checkInteractions(otherMedicines),
          MCP_TIMEOUT_MS,
          "checkInteractions",
        ),
    });
  }

  return tasks;
};

export const answerMedicineQuestion = async (req, res, next) => {
  try {
    const groqReady = !!process.env.GROQ_API_KEY;
    const geminiReady = !!process.env.GEMINI_API_KEY;

    if (!groqReady && !geminiReady) {
      return res.status(500).json({
        success: false,
        message:
          "No AI provider configured. Add GROQ_API_KEY or GEMINI_API_KEY to .env",
      });
    }

    const question = String(req.body?.question || "").trim();
    const providedMedicineName = String(req.body?.medicineName || "").trim();
    const context =
      req.body?.context && typeof req.body.context === "object"
        ? req.body.context
        : {};

    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Please ask your question.",
      });
    }

    const safeResult = isSafeQuestion(question);
    if (!safeResult.safe) {
      return res.json({
        success: true,
        answer:
          "I'm not able to help with that query. If you are experiencing a medical emergency or mental health crisis, please call NIMHANS helpline: 080-46110007 or iCall: 9152987821 immediately.",
        confidenceLevel: "Safety Block",
        emergency: true,
        sources: [],
        provider: "safety-filter",
        followUps: [],
      });
    }

    if (wordCount(question) < 3 && !hasMedicalKeywords(question)) {
      return res.json({
        success: true,
        answer:
          "I can only help with medicine and health related questions. Please ask me about a specific medicine, symptom, or health concern.",
        confidenceLevel: "Out of Scope",
        emergency: false,
        sources: [],
        provider: "scope-filter",
        followUps: [],
      });
    }

    const { medicineName, confident: medicineConfident } = detectMedicineName(
      providedMedicineName,
      question,
    );

    const cacheKey = makeCacheKey({ question, medicineName });
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      debugLog("cache-hit", {
        key: cacheKey,
        question: question.slice(0, 80),
        medicineName,
      });
      return res.json(cached);
    }

    const userId = String(req.user?.id || req.user?._id || "anonymous");
    const now = Date.now();
    const lastCallAt = userLastCallAt.get(userId) || 0;

    if (now - lastCallAt < USER_COOLDOWN_MS) {
      const pending = userPendingResponse.get(userId);
      if (pending) {
        debugLog("cooldown-pending-reuse", { userId });
        const pendingPayload = await pending;
        return res.json(pendingPayload);
      }

      const recent = userLastResponse.get(userId);
      if (recent) {
        debugLog("cooldown-last-response-reuse", { userId });
        return res.json(recent);
      }
    }

    const otherMedicines = Array.isArray(context.otherMedicines)
      ? context.otherMedicines
          .map((name) => String(name || "").trim())
          .filter(Boolean)
      : [];

    const mcpTasks = pickMcpTasks({
      medicineName,
      medicineConfident,
      question,
      otherMedicines,
    });

    debugLog("mcp-tasks-selected", {
      userId,
      medicineName,
      medicineConfident,
      wordCount: wordCount(question),
      guidelineIntent: hasGuidelineIntent(question),
      otherMedicinesCount: otherMedicines.length,
      tasks: mcpTasks.map((task) => task.key),
    });

    const mcpResults = {
      drugData: null,
      literature: [],
      guidelines: [],
      interactions: [],
    };

    if (mcpTasks.length > 0) {
      const settled = await Promise.allSettled(
        mcpTasks.map((task) => task.run()),
      );
      settled.forEach((result, index) => {
        const key = mcpTasks[index].key;
        if (result.status === "fulfilled") {
          mcpResults[key] = result.value;
        }
      });

      debugLog("mcp-tasks-finished", {
        userId,
        results: settled.map((result, index) => ({
          task: mcpTasks[index].key,
          status: result.status,
        })),
      });
    }

    const evidenceAvailable = hasAnyEvidence(mcpResults);

    const enrichedSystemPrompt = evidenceAvailable
      ? MEDICAL_SYSTEM_PROMPT_TEMPLATE.replace(
          "{{DRUG_INFO}}",
          formatDrugContext(mcpResults.drugData),
        )
          .replace(
            "{{LITERATURE}}",
            formatLiteratureContext(mcpResults.literature),
          )
          .replace(
            "{{GUIDELINES}}",
            formatGuidelinesContext(mcpResults.guidelines),
          )
          .replace(
            "{{INTERACTIONS}}",
            formatInteractionsContext(mcpResults.interactions),
          )
      : BASIC_SYSTEM_PROMPT;

    const systemPrompt = buildPrompt({
      question,
      medicineName,
      context,
      evidenceText: enrichedSystemPrompt,
    });

    debugLog("ai-request", {
      userId,
      evidenceAvailable,
      sourcesCountEstimate: buildSources({
        drugData: mcpResults.drugData,
        literature: mcpResults.literature,
        guidelines: mcpResults.guidelines,
      }).length,
    });

    userLastCallAt.set(userId, Date.now());

    const pendingResponse = (async () => {
      const aiResult = await callAI(systemPrompt, question);
      const followUps = generateFollowUps(medicineName, question);

      if (aiResult.failed || !aiResult.answer) {
        const mcpSummary = evidenceAvailable
          ? buildMcpOnlySummary({
              drugData: mcpResults.drugData,
              guidelines: mcpResults.guidelines,
            })
          : null;

        const payload = {
          success: true,
          answer: mcpSummary
            ? `Based on verified medical databases:\n\n${mcpSummary}\n\nFor detailed guidance, please consult a licensed pharmacist.`
            : "Our AI assistant is temporarily unavailable. Please consult a licensed pharmacist for medical advice.",
          confidenceLevel: mcpSummary
            ? "MCP Verified — AI Unavailable"
            : "Service Temporarily Unavailable",
          emergency: false,
          sources: evidenceAvailable
            ? buildSources({
                drugData: mcpResults.drugData,
                literature: mcpResults.literature,
                guidelines: mcpResults.guidelines,
              })
            : [],
          citations: "Sources: FDA + RxNorm database",
          provider: "none",
          followUps,
        };

        setCachedResponse(cacheKey, payload);
        userLastResponse.set(userId, payload);
        return payload;
      }

      const payload = {
        success: true,
        answer: aiResult.answer,
        confidenceLevel: evidenceAvailable
          ? `Verified — FDA + PubMed (via ${aiResult.provider})`
          : `AI Generated — verify with pharmacist (via ${aiResult.provider})`,
        emergency: false,
        sources: evidenceAvailable
          ? buildSources({
              drugData: mcpResults.drugData,
              literature: mcpResults.literature,
              guidelines: mcpResults.guidelines,
            })
          : [],
        citations: evidenceAvailable
          ? "Sources: FDA drug database, PubMed literature"
          : "Sources unavailable",
        provider: aiResult.provider,
        followUps,
      };

      setCachedResponse(cacheKey, payload);
      userLastResponse.set(userId, payload);
      return payload;
    })();

    userPendingResponse.set(userId, pendingResponse);

    const payload = await pendingResponse;

    const historyUserId = req.user?._id || req.user?.id;
    if (historyUserId) {
      ChatHistory.findOneAndUpdate(
        { userId: historyUserId },
        {
          $push: {
            messages: {
              $each: [
                { role: "user", text: question },
                {
                  role: "bot",
                  text: payload.answer,
                  confidenceLevel: payload.confidenceLevel,
                  sources: payload.sources,
                  provider: payload.provider,
                },
              ],
              $slice: -100,
            },
          },
          $set: { updatedAt: new Date() },
        },
        { upsert: true, new: true },
      ).catch((err) => console.error("[chat-history] save failed", err));
    }

    return res.json(payload);
  } catch (error) {
    return next(error);
  } finally {
    const userId = String(req.user?.id || req.user?._id || "anonymous");
    userPendingResponse.delete(userId);
  }
};

export const getChatHistory = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const history = await ChatHistory.findOne({ userId }).lean();
    if (!history?.messages?.length) {
      return res.json({ success: true, messages: [] });
    }

    const messages = history.messages
      .slice(-50)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return res.json({ success: true, messages });
  } catch (error) {
    return next(error);
  }
};

export const clearChatHistory = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await ChatHistory.deleteOne({ userId });
    return res.json({ success: true, message: "History cleared" });
  } catch (error) {
    return next(error);
  }
};

export const getAssistantProviderStatus = (req, res) => {
  return res.json({
    groq: {
      configured: !!process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    },
    gemini: {
      configured: !!process.env.GEMINI_API_KEY,
      model: "gemini-2.0-flash",
    },
    primary: String(process.env.AI_PRIMARY || "groq").toLowerCase(),
    fallback: String(process.env.AI_FALLBACK || "gemini").toLowerCase(),
  });
};
