/**
 * Google Gemini API Service
 * Free OCR text parser using Gemini Flash model
 * No cost for prescription parsing
 */

import fetch from "node-fetch";

const GEMINI_MODEL = "gemini-2.0-flash"; // Free model, very fast

/**
 * Parse prescription OCR text using Gemini
 * @param {string} ocrText - Raw OCR text from Tesseract
 * @returns {Promise<Object>} - Structured prescription JSON
 */
export const parseWithGemini = async (ocrText) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.log("[GEMINI] No API key configured - check .env file");
      return null;
    }
    console.log(
      "[GEMINI] API key found:",
      GEMINI_API_KEY.substring(0, 20) + "...",
    );

    if (!ocrText || ocrText.length < 5) {
      console.log("[GEMINI] OCR text too short");
      return null;
    }

    console.log("[GEMINI] Starting prescription parsing with Gemini Flash...");

    const prompt = `# SWIFTPHARMA – AI PRESCRIPTION PARSER (SYSTEM PROMPT)
You are **SwiftPharma Prescription Parsing Engine**.
You analyze RAW OCR TEXT from Indian medical prescriptions and output STRICT JSON only.
You are NOT a chatbot.

## INPUT
RAW OCR TEXT (messy, handwritten, misspelled):
${ocrText}

## CORE OBJECTIVE
- Never fail silently.
- Never return empty medicines if medicine-like patterns exist (tab, cap, mg, bd, tds, od, 1-0-1, etc.).
- Prefer low-confidence extraction over omission.

## WHAT TO EXTRACT
### MEDICINES (array, required)
For each detected or partial medicine:
- name: standardized if clear else null
- strength: e.g., "650 mg" or null
- dosage_pattern: e.g., "1-0-1", "BD", "TDS", "OD" or null
- frequency_per_day: number or null
- duration_days: integer or null
- confidence: 0.0-1.0

### PRESCRIPTION METADATA
- doctor.name
- doctor.qualification
- hospital
- prescription_date
Set to null if unclear.

### SAFETY FLAGS
- duplicate_medicines
- unclear_dosage
- missing_duration
- handwritten_uncertain

## INTELLIGENCE RULES
- BD -> frequency_per_day = 2
- TDS -> frequency_per_day = 3
- OD -> frequency_per_day = 1
- 1-0-1 -> frequency_per_day = 2
- "x 5 days" -> duration_days = 5

## STRICT RULES
- DO NOT invent medicines.
- DO NOT give advice.
- DO NOT explain.
- OUTPUT JSON ONLY.

## FALLBACK BEHAVIOR (critical)
If medicine-like patterns exist but name unclear:
- name: null
- confidence: < 0.4
- handwritten_uncertain: true

## OUTPUT FORMAT (exact)
{
  "medicines": [
    {
      "name": "Paracetamol",
      "strength": "650 mg",
      "dosage_pattern": "1-0-1",
      "frequency_per_day": 2,
      "duration_days": 5,
      "confidence": 0.92
    }
  ],
  "doctor": {
    "name": "Dr. R K Sharma",
    "qualification": "MBBS MD"
  },
  "hospital": "City Hospital",
  "prescription_date": "2025-08-12",
  "safety_flags": {
    "duplicate_medicines": false,
    "unclear_dosage": false,
    "missing_duration": false,
    "handwritten_uncertain": true
  }
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("[GEMINI] API Error:", error);
      return null;
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.log("[GEMINI] No content in response");
      return null;
    }

    console.log("[GEMINI] Raw response:", content.substring(0, 200));

    // Remove markdown code blocks if present
    const cleanContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(cleanContent);

    console.log(
      "[GEMINI] Successfully parsed medicines:",
      parsed.medicines?.length || 0,
    );

    // CATCH-ALL: If medicines array is empty but OCR has patterns, create low-confidence entry
    if (!parsed.medicines || parsed.medicines.length === 0) {
      // Check if OCR text has medicine-like patterns
      const hasMedicinePatterns =
        /\b(tab|tablet|cap|capsule|mg|ml|BD|TDS|OD|1-0-1|0-1-1|2-0-2|gm|gram|drop|dose|medicine|drug)\b/i.test(
          ocrText,
        );

      if (hasMedicinePatterns) {
        console.log(
          "[GEMINI] No medicines in Gemini response but OCR has patterns, creating low-confidence entry",
        );
        parsed.medicines = [
          {
            name: null,
            strength: null,
            dosage_pattern: null,
            frequency_per_day: null,
            duration_days: null,
            confidence: 0.3,
          },
        ];
        parsed.safety_flags = {
          ...parsed.safety_flags,
          handwritten_uncertain: true,
          unclear_dosage: true,
        };
      }
    }

    return {
      success: true,
      data: parsed,
      source: "gemini-flash",
    };
  } catch (error) {
    console.error("[GEMINI] Parsing error:", error.message);

    // FALLBACK on parse error: if OCR has medicine patterns, return low-confidence entry
    const hasMedicinePatterns =
      /\b(tab|tablet|cap|capsule|mg|ml|BD|TDS|OD|1-0-1|0-1-1|2-0-2|gm|gram|drop|dose|medicine|drug)\b/i.test(
        ocrText,
      );

    if (hasMedicinePatterns) {
      console.log(
        "[GEMINI] JSON parse failed but OCR has patterns, returning low-confidence fallback",
      );
      return {
        success: true,
        data: {
          medicines: [
            {
              name: null,
              strength: null,
              dosage_pattern: null,
              frequency_per_day: null,
              duration_days: null,
              confidence: 0.25,
            },
          ],
          doctor: { name: null, qualification: null },
          hospital: null,
          prescription_date: null,
          safety_flags: {
            duplicate_medicines: false,
            unclear_dosage: true,
            missing_duration: true,
            handwritten_uncertain: true,
          },
        },
        source: "gemini-flash-fallback",
      };
    }

    return {
      success: false,
      error: error.message,
      source: "gemini-flash",
    };
  }
};

/**
 * Validate medicine using Gemini
 * @param {string} medicineName - Medicine name to validate
 * @returns {Promise<Object>} - Validation result
 */
export const validateMedicineWithGemini = async (medicineName) => {
  try {
    if (!GEMINI_API_KEY) return null;

    const prompt = `Validate this Indian medicine name and return JSON:
${medicineName}

Return only JSON:
{
  "isValid": true/false,
  "standardName": "Standardized name",
  "category": "Category like Pain Relief, Antibiotic, etc",
  "confidence": 0.0 to 1.0
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          },
        }),
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) return null;

    const cleanContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleanContent);
  } catch (error) {
    console.error("[GEMINI] Validation error:", error.message);
    return null;
  }
};

export default { parseWithGemini, validateMedicineWithGemini };

