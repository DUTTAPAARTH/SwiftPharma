import Groq from "groq-sdk";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const callGroq = async (systemPrompt, userMessage) => {
  const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const completion = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.4,
    max_tokens: 512,
  });

  const answer = completion.choices?.[0]?.message?.content;
  if (!answer) throw new Error("No response from Groq");

  return { answer: answer.trim(), provider: "Groq" };
};

const callGemini = async (systemPrompt, userMessage) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const prompt = `${systemPrompt}\n\nUser question: ${userMessage}`;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 512,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini failed with status ${response.status}`);
  }

  const data = await response.json();
  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answer) throw new Error("No response from Gemini");

  return { answer: answer.trim(), provider: "Gemini" };
};

export const callAI = async (systemPrompt, userMessage) => {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const primary = String(process.env.AI_PRIMARY || "groq").toLowerCase();
  const fallback = String(process.env.AI_FALLBACK || "gemini").toLowerCase();

  const attempts = [];

  if (primary === "groq" && groqKey) {
    try {
      attempts.push("groq");
      const result = await callGroq(systemPrompt, userMessage);
      console.log("[AI] Groq responded successfully");
      return { ...result, attempts };
    } catch (groqError) {
      const reason = groqError?.message || "Unknown error";
      console.warn(`[AI] Groq failed (${reason}), falling back to Gemini`);
    }
  }

  if ((fallback === "gemini" || primary !== "gemini") && geminiKey) {
    try {
      attempts.push("gemini");
      const result = await callGemini(systemPrompt, userMessage);
      console.log("[AI] Gemini fallback responded successfully");
      return { ...result, attempts };
    } catch (geminiError) {
      const reason = geminiError?.message || "Unknown error";
      console.warn(`[AI] Gemini also failed (${reason})`);
    }
  }

  if (primary !== "groq" && groqKey) {
    try {
      attempts.push("groq-last");
      const result = await callGroq(systemPrompt, userMessage);
      return { ...result, attempts };
    } catch {
      console.error("[AI] All providers failed");
    }
  }

  return {
    answer: null,
    provider: "none",
    attempts,
    failed: true,
  };
};

