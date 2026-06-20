import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import fetch from "node-fetch";
import Groq from "groq-sdk";
import Prescription from "../models/Prescription.js";
import DoctorProfile from "../models/DoctorProfile.js";
import {
  runOcr as sharedRunOcr,
  parseMedicines as sharedParseMedicines,
} from "./prescriptionController.js";
import { callAI } from "../services/aiService.js";
import { parseWithGemini } from "../services/geminiService.js";
import parsePrescriptionOCR from "../services/prescriptionParser.js";
import { emitPrescriptionUpdate } from "../services/prescriptionEvents.js";

const uploadsDir = path.resolve(process.cwd(), "uploads", "prescriptions");

const ensureUploadsDir = async () => {
  await fs.promises.mkdir(uploadsDir, { recursive: true });
};

const GEMINI_MODEL = "gemini-2.0-flash";

// Enhanced preprocessing for better OCR
const preprocessImage = async (filePath) => {
  const processedPath = path.join(uploadsDir, `ai-scan-${Date.now()}.png`);

  await sharp(filePath)
    .rotate()
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.5 })
    .toFormat("png")
    .toFile(processedPath);

  const buffer = await fs.promises.readFile(processedPath);
  return { processedPath, buffer };
};

// Normalize medicines to ensure consistent format
const normalizeMedicines = (medicines) => {
  if (!Array.isArray(medicines)) return [];

  return medicines
    .filter((med) => med && med.name)
    .map((med) => ({
      name: med.name || "Unknown",
      dosage: med.dosage || med.dosage_pattern || "As directed",
      quantity: String(med.quantity || med.duration_days || "As directed"),
    }));
};

const parseGeminiJson = (content) => {
  const cleaned = (content || "")
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
};

const parseStructuredValidationJson = (content) => {
  const cleaned = (content || "")
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
};

const buildFallbackValidation = (reason, flags = []) => ({
  isValidPrescription: true,
  confidenceScore: 55,
  doctorName: null,
  doctorRegistrationNumber: null,
  patientName: null,
  prescriptionDate: null,
  medicines: [],
  rejectionReason: null,
  flags: ["ai_validator_unavailable", ...flags, reason].filter(Boolean),
});

const mapValidationResponse = (parsed) => ({
  isValidPrescription: Boolean(parsed?.isValidPrescription),
  confidenceScore: Math.max(
    0,
    Math.min(100, Number(parsed?.confidenceScore || 0)),
  ),
  doctorName: parsed?.doctorName || null,
  doctorRegistrationNumber: parsed?.doctorRegistrationNumber || null,
  patientName: parsed?.patientName || null,
  prescriptionDate: parsed?.prescriptionDate || null,
  medicines: Array.isArray(parsed?.medicines) ? parsed.medicines : [],
  rejectionReason: parsed?.rejectionReason || null,
  flags: Array.isArray(parsed?.flags) ? parsed.flags : [],
});

const tryGroqValidation = async (prompt, extractedText) => {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  try {
    const client = new Groq({ apiKey: groqKey });
    const completion = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `OCR TEXT:\n${extractedText || ""}` },
      ],
      temperature: 0.1,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const answer = completion?.choices?.[0]?.message?.content;
    if (!answer) return null;

    const parsed = parseStructuredValidationJson(answer);
    const mapped = mapValidationResponse(parsed);
    return {
      ...mapped,
      flags: [...mapped.flags, "validator_provider_groq"],
    };
  } catch (error) {
    console.warn(
      "[AI-SCAN] Groq fallback validation failed:",
      error?.message || error,
    );
    return null;
  }
};

export const validatePrescriptionWithAI = async (
  extractedText,
  imageBase64,
) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  const prompt = `You are a strict prescription validator for an Indian pharmacy.
Analyze this prescription and respond ONLY with valid JSON:
{
  "isValidPrescription": true/false,
  "confidenceScore": 0-100,
  "doctorName": "string or null",
  "doctorRegistrationNumber": "string or null",
  "patientName": "string or null",
  "prescriptionDate": "string or null",
  "medicines": [{ "name": "string", "dosage": "string", "quantity": "string" }],
  "rejectionReason": "string or null",
  "flags": ["list of any concerns found"]
}

Reject (isValidPrescription: false) if:
- No doctor name or signature visible
- No doctor registration number (MCI/State Medical Council)
- No patient name
- No date on prescription
- Prescription appears to be a photo of a screen/digital copy
- Prescription is older than 6 months
- Handwriting is completely illegible
- Image is too blurry to read
- Appears to be a fake or template prescription

Confidence score guide:
- 90-100: Clear prescription, all fields present
- 70-89: Most fields present, minor issues
- 50-69: Some fields missing, needs pharmacist review
- Below 50: Likely invalid, reject`;

  if (!GEMINI_API_KEY) {
    if (GROQ_API_KEY) {
      const groqValidation = await tryGroqValidation(prompt, extractedText);
      if (groqValidation) {
        console.log(
          "[AI-SCAN] Using Groq fallback validator (Gemini key missing)",
        );
        return groqValidation;
      }
    }
    return buildFallbackValidation("gemini_api_key_missing");
  }

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
              { text: prompt },
              { text: `OCR TEXT:\n${extractedText || ""}` },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    const quotaOrRateLimited = response.status === 429;
    const flags = [
      quotaOrRateLimited ? "gemini_quota_exceeded" : "gemini_api_error",
      `gemini_status_${response.status}`,
    ];
    console.warn(
      `[AI-SCAN] Gemini validation unavailable (status ${response.status}). Falling back to pharmacist review.`,
    );
    console.warn("[AI-SCAN] Gemini error payload:", err);

    if (GROQ_API_KEY) {
      const groqValidation = await tryGroqValidation(prompt, extractedText);
      if (groqValidation) {
        console.log(
          "[AI-SCAN] Using Groq fallback validator after Gemini failure",
        );
        return groqValidation;
      }
    }

    return buildFallbackValidation(
      quotaOrRateLimited ? "gemini_rate_limited" : "gemini_unavailable",
      flags,
    );
  }

  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    console.warn(
      "[AI-SCAN] Gemini validation returned empty content. Falling back to pharmacist review.",
    );
    if (GROQ_API_KEY) {
      const groqValidation = await tryGroqValidation(prompt, extractedText);
      if (groqValidation) {
        console.log(
          "[AI-SCAN] Using Groq fallback validator after empty Gemini response",
        );
        return groqValidation;
      }
    }
    return buildFallbackValidation("gemini_empty_response", [
      "gemini_api_error",
    ]);
  }

  let parsed;
  try {
    parsed = parseGeminiJson(content);
  } catch (parseError) {
    console.warn(
      "[AI-SCAN] Gemini validation JSON parse failed. Falling back to pharmacist review.",
      parseError?.message,
    );
    if (GROQ_API_KEY) {
      const groqValidation = await tryGroqValidation(prompt, extractedText);
      if (groqValidation) {
        console.log(
          "[AI-SCAN] Using Groq fallback validator after Gemini parse error",
        );
        return groqValidation;
      }
    }
    return buildFallbackValidation("gemini_invalid_json", [
      "gemini_parse_error",
    ]);
  }

  const mapped = mapValidationResponse(parsed);
  return {
    ...mapped,
    flags: [...mapped.flags, "validator_provider_gemini"],
  };
};

const parseMaybeJson = (value) => {
  if (!value || typeof value !== "string") return value;
  const trimmed = value.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return value;
      }
    }
    return value;
  }
};

const normalizeDoctorName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildHandwritingPatternHash = (text) => {
  const normalized = String(text || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  if (!normalized) return "";
  return crypto.createHash("sha256").update(normalized).digest("hex");
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseLocation = (rawValue, rawLat, rawLng, rawAddress) => {
  let location = rawValue;
  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (trimmed.startsWith("{")) {
      try {
        location = JSON.parse(trimmed);
      } catch {
        location = {};
      }
    }
  }

  const lat =
    toNumber(location?.lat) ??
    toNumber(location?.latitude) ??
    toNumber(rawLat) ??
    null;
  const lng =
    toNumber(location?.lng) ??
    toNumber(location?.longitude) ??
    toNumber(rawLng) ??
    null;
  const address = String(location?.address || rawAddress || "").trim();

  return { lat, lng, address };
};

const haversineDistanceKm = (from, to) => {
  if (
    from?.lat == null ||
    from?.lng == null ||
    to?.lat == null ||
    to?.lng == null
  ) {
    return null;
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return Number((R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1));
};

const buildProcessingStages = ({ now, aiCompleted }) => [
  {
    stage: "uploaded",
    status: "completed",
    completedAt: now,
    note: "Prescription image uploaded",
  },
  {
    stage: "ocr",
    status: "completed",
    completedAt: now,
    note: "OCR extraction completed",
  },
  {
    stage: "ai",
    status: aiCompleted ? "completed" : "pending",
    completedAt: aiCompleted ? now : null,
    note: aiCompleted ? "AI validation completed" : "AI validation pending",
  },
  {
    stage: "pharmacist",
    status: "pending",
    completedAt: null,
    note: "Queued for pharmacist review",
  },
  {
    stage: "approved",
    status: "pending",
    completedAt: null,
    note: "Awaiting final approval",
  },
];

const updateDoctorTrustProfile = async ({
  doctorName,
  registrationNumber,
  handwritingPatternHash,
}) => {
  const normalizedDoctorName = normalizeDoctorName(doctorName);
  const registration = String(registrationNumber || "").trim();
  if (!registration && !normalizedDoctorName) {
    return { trustScore: 50, handwritingMismatch: false };
  }

  const query = registration
    ? { registrationNumber: registration }
    : { doctorNameNormalized: normalizedDoctorName };

  let profile = await DoctorProfile.findOne(query);
  let handwritingMismatch = false;

  if (!profile) {
    profile = new DoctorProfile({
      doctorName: doctorName || "Unknown Doctor",
      doctorNameNormalized: normalizedDoctorName,
      registrationNumber: registration || undefined,
      handwritingPatternHash,
      trustScore: 65,
      matchCount: handwritingPatternHash ? 1 : 0,
      mismatchCount: 0,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
    await profile.save();
    return { trustScore: profile.trustScore, handwritingMismatch: false };
  }

  if (
    profile.handwritingPatternHash &&
    handwritingPatternHash &&
    profile.handwritingPatternHash !== handwritingPatternHash
  ) {
    handwritingMismatch = true;
    profile.mismatchCount = Number(profile.mismatchCount || 0) + 1;
    profile.trustScore = Math.max(0, Number(profile.trustScore || 50) - 12);
  } else if (handwritingPatternHash) {
    profile.matchCount = Number(profile.matchCount || 0) + 1;
    profile.trustScore = Math.min(100, Number(profile.trustScore || 50) + 2);
  }

  profile.doctorName = doctorName || profile.doctorName;
  profile.doctorNameNormalized = normalizedDoctorName || profile.doctorNameNormalized;
  profile.registrationNumber = registration || profile.registrationNumber;
  profile.handwritingPatternHash = handwritingPatternHash || profile.handwritingPatternHash;
  profile.lastSeenAt = new Date();

  await profile.save();

  return {
    trustScore: Number(profile.trustScore || 50),
    handwritingMismatch,
  };
};

export const askAIPrompt = async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) {
      return res
        .status(400)
        .json({ success: false, message: "prompt is required" });
    }

    const ai = await callAI(
      "You are a medical assistant. Return concise and safe results. If JSON is requested, return valid JSON only.",
      prompt,
    );

    if (!ai?.answer) {
      return res
        .status(503)
        .json({ success: false, message: "AI unavailable" });
    }

    return res.json({
      success: true,
      result: parseMaybeJson(ai.answer),
      provider: ai.provider || "unknown",
    });
  } catch (error) {
    console.error("askAIPrompt error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to process AI prompt" });
  }
};

// Look for frequency patterns after medicine name
// Extract doctor information
const extractDoctor = (ocrText) => {
  const doctorMatch = ocrText.match(/Dr\.?\s+([A-Z][A-Za-z.\s]+)/);
  const name = doctorMatch ? doctorMatch[0].trim() : undefined;

  const regMatch = ocrText.match(
    /(?:Reg\.?|Registration|License)\s*(?:No\.?|Number)?[\s:]*([A-Z0-9\-\/]+)/i,
  );
  const reg_no = regMatch ? regMatch[1].trim() : undefined;

  return { name, reg_no };
};

// Extract issue date
const extractDate = (ocrText) => {
  const dateMatch = ocrText.match(
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\-]\d{2}[\-]\d{2})/,
  );
  return dateMatch ? new Date(dateMatch[0]) : new Date();
};

export const scanPrescription = async (req, res) => {
  try {
    await ensureUploadsDir();
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    if (!file.path || !fs.existsSync(file.path)) {
      return res.status(500).json({
        success: false,
        message: "Upload failed: file not saved",
      });
    }

    console.log("[AI-SCAN] Processing file:", file.originalname);

    // Preprocess image
    const processed = await preprocessImage(file.path);
    const prescriptionDNA = crypto
      .createHash("sha256")
      .update(processed.buffer)
      .digest("hex");
    const duplicatePrescription = await Prescription.findOne({
      prescriptionDNA,
    })
      .select("_id")
      .lean();

    // Generate local URL for the image instead of Cloudinary
    const imageFilename = `ai-scan-${Date.now()}-${path.basename(
      file.originalname,
    )}`;
    const publicImagePath = path.join(uploadsDir, imageFilename);

    // Copy processed image to a permanent location
    await fs.promises.copyFile(processed.processedPath, publicImagePath);

    // Create URL path (for local development, images are served from uploads folder)
    const imageUrl = `/uploads/prescriptions/${imageFilename}`;
    console.log("[AI-SCAN] Image saved locally:", imageUrl);

    let medicines = [];
    let doctor = {};
    let issuedDate = new Date();
    let ocrText = "";
    let safetyFlags = null;
    let extractionMethod = "unknown";
    let aiValidation = null;

    // Step 1: Extract text using Tesseract OCR
    console.log("[SCAN] Running Tesseract OCR...");
    ocrText = await sharedRunOcr(processed.processedPath);

    if (!ocrText || ocrText.length < 10) {
      return res.status(422).json({
        success: false,
        message:
          "Unable to extract text from image. Please upload a clearer image with readable text.",
        imageUrl: imageUrl,
        code: "NO_TEXT_DETECTED",
      });
    }

    console.log("[SCAN] OCR text length:", ocrText.length);
    console.log("[SCAN] OCR preview:", ocrText.substring(0, 150));

    // Step 2: Parse medicines from OCR.
    console.log("[SCAN] Attempting Gemini Flash parsing...");
    const geminiResult = await parseWithGemini(ocrText);

    let parsedData = null;

    if (geminiResult && geminiResult.success && geminiResult.data) {
      console.log("[SCAN] Gemini parsing successful!");
      parsedData = geminiResult.data;
      extractionMethod = "gemini-flash";
      console.log(
        "[SCAN] Medicines from Gemini:",
        JSON.stringify(parsedData.medicines || [], null, 2),
      );

      medicines = normalizeMedicines(parsedData.medicines || []);

      doctor = {
        name: parsedData.doctor?.name,
        reg_no: parsedData.doctor?.qualification,
      };

      if (parsedData.prescription_date) {
        issuedDate = new Date(parsedData.prescription_date);
      }

      safetyFlags = parsedData.safety_flags;
    } else {
      // Step 3: Fallback to local prescriptionParser
      console.log(
        "[SCAN] Gemini unavailable or failed, using local parser as fallback...",
      );
      parsedData = parsePrescriptionOCR(ocrText);
      extractionMethod = "local-parser";
      console.log(
        "[SCAN] Medicines from Local Parser:",
        JSON.stringify(parsedData.medicines || [], null, 2),
      );

      medicines = normalizeMedicines(parsedData.medicines || []);

      doctor = {
        name: parsedData.doctor?.name,
        reg_no: parsedData.doctor?.qualification,
      };

      if (parsedData.prescription_date) {
        issuedDate = new Date(parsedData.prescription_date);
      }

      safetyFlags = parsedData.safety_flags;
    }

    // Fallback for medicine extraction if both parsers fail.
    if (!medicines.length) {
      medicines = normalizeMedicines(sharedParseMedicines(ocrText) || []);
    }

    // Check if medicines were found
    console.log("[SCAN] Final medicines count:", medicines.length);
    if (medicines.length === 0) {
      console.error(
        "[SCAN] No medicines detected after parsing (Gemini + Fallback)",
      );
      console.error("[SCAN] Parsed data:", JSON.stringify(parsedData, null, 2));
      return res.status(422).json({
        success: false,
        message:
          "No medicines detected. Please ensure the prescription is clear and readable.",
        imageUrl: imageUrl,
        code: "NO_MEDICINES_FOUND",
        extractionMethod,
        safetyFlags,
      });
    }

    // Step 3: Strict AI prescription validity check (hard gate).
    const imageBase64 = processed.buffer.toString("base64");
    aiValidation = await validatePrescriptionWithAI(ocrText, imageBase64);

    const validationDate = aiValidation.prescriptionDate
      ? new Date(aiValidation.prescriptionDate)
      : issuedDate;
    if (!Number.isNaN(validationDate.getTime())) {
      issuedDate = validationDate;
    }

    const confidenceScore = Number(aiValidation.confidenceScore || 0);
    const lowConfidence = confidenceScore >= 50 && confidenceScore < 80;
    const hardRejected =
      !aiValidation.isValidPrescription || confidenceScore < 50;

    const derivedStatus = hardRejected ? "ai_rejected" : "awaiting_pharmacist";

    const rejectionReason = hardRejected
      ? aiValidation.rejectionReason ||
        "Prescription did not pass strict AI validation"
      : null;

    const combinedFlags = Array.isArray(aiValidation.flags)
      ? [...aiValidation.flags]
      : [];
    if (lowConfidence && !combinedFlags.includes("low_confidence")) {
      combinedFlags.push("low_confidence");
    }

    const isDuplicateImage = Boolean(duplicatePrescription?._id);
    if (isDuplicateImage && !combinedFlags.includes("duplicate_image_detected")) {
      combinedFlags.push("duplicate_image_detected");
    }

    const handwritingPatternHash = buildHandwritingPatternHash(ocrText);
    const trustEvaluation = await updateDoctorTrustProfile({
      doctorName: aiValidation.doctorName || doctor.name,
      registrationNumber: aiValidation.doctorRegistrationNumber || doctor.reg_no,
      handwritingPatternHash,
    });
    const doctorTrustScore = trustEvaluation.trustScore;
    const handwritingMismatch = trustEvaluation.handwritingMismatch;
    if (handwritingMismatch && !combinedFlags.includes("handwriting_mismatch")) {
      combinedFlags.push("handwriting_mismatch");
    }

    const doctorLocation = parseLocation(
      req.body.doctorLocation,
      req.body.doctorLat,
      req.body.doctorLng,
      req.body.doctorAddress,
    );
    const patientLocation = parseLocation(
      req.body.patientLocation,
      req.body.patientLat,
      req.body.patientLng,
      req.body.patientAddress,
    );
    const geoDistanceKm = haversineDistanceKm(doctorLocation, patientLocation);
    const geoFlag = geoDistanceKm != null && geoDistanceKm > 500;
    if (geoFlag && !combinedFlags.includes("geo_distance_outlier")) {
      combinedFlags.push("geo_distance_outlier");
    }

    const aiMeds = normalizeMedicines(aiValidation.medicines || medicines);
    const now = new Date();
    const estimatedCompletionTime = new Date(now.getTime() + 30 * 60 * 1000);
    const processingStages = buildProcessingStages({
      now,
      aiCompleted: true,
    });

    const fallbackExpiryDate = new Date(
      Date.now() + 6 * 30 * 24 * 60 * 60 * 1000,
    );
    let expiryDate = new Date(issuedDate);
    expiryDate.setMonth(expiryDate.getMonth() + 6);

    if (
      !expiryDate ||
      Number.isNaN(expiryDate.getTime()) ||
      expiryDate < new Date()
    ) {
      expiryDate = fallbackExpiryDate;
    }

    // SECURITY: Always use authenticated user's ID - never accept from request body
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Please log in to upload prescriptions",
        code: "AUTH_REQUIRED",
      });
    }

    const safeStatus =
      derivedStatus === "expired" ? "awaiting_pharmacist" : derivedStatus;

    const prescriptionPayload = {
      userId: req.user.id,
      images: [imageUrl],
      ocrText,
      doctorName: doctor.name,
      doctorTrustScore,
      handwritingMismatch,
      prescriptionDNA,
      isDuplicateImage,
      duplicateOfPrescriptionId: duplicatePrescription?._id || null,
      duplicateOf: duplicatePrescription?._id || null,
      doctorLocation,
      patientLocation,
      geoDistanceKm,
      geoFlag,
      issueDate: issuedDate,
      expiryDate,
      doctorRegistration:
        aiValidation.doctorRegistrationNumber || doctor.reg_no,
      status: safeStatus,
      isExpired: false,
      aiValidated: !hardRejected,
      aiConfidenceScore: confidenceScore,
      aiExtractedMedicines: aiMeds,
      aiRejectionReason: rejectionReason,
      aiFlags: combinedFlags,
      processingStages,
      estimatedCompletionTime,
      verificationAttempts: 1,
      lastVerificationAt: new Date(),
      notes: req.body.notes || "",
    };

    if (
      !prescriptionPayload.expiryDate ||
      Number.isNaN(new Date(prescriptionPayload.expiryDate).getTime()) ||
      prescriptionPayload.expiryDate < new Date()
    ) {
      prescriptionPayload.expiryDate = fallbackExpiryDate;
    }
    prescriptionPayload.isExpired = false;

    // Save prescription record
    const prescription = await Prescription.create(prescriptionPayload);

    const anomalyFlags = [
      "low_confidence",
      "duplicate_image_detected",
      "handwriting_mismatch",
      "geo_distance_outlier",
    ];
    const anomalyList = combinedFlags.filter((flag) => anomalyFlags.includes(flag));

    await emitPrescriptionUpdate({
      userId: req.user.id,
      prescriptionId: prescription._id,
      reason: "upload",
      payload: {
        status: prescription.status,
        doctorTrustScore,
      },
    });

    if (anomalyList.length) {
      await emitPrescriptionUpdate({
        userId: req.user.id,
        prescriptionId: prescription._id,
        reason: "anomaly",
        payload: {
          status: prescription.status,
          flags: anomalyList,
          geoDistanceKm,
        },
      });
    }

    console.log("[AI-SCAN] Prescription created:", prescription._id);

    // Clean up temp files
    try {
      if (file.path !== publicImagePath) {
        fs.unlinkSync(file.path);
      }
      if (processed.processedPath !== publicImagePath) {
        fs.unlinkSync(processed.processedPath);
      }
    } catch (err) {
      console.error("[AI-SCAN] Cleanup error:", err.message);
    }

    return res.json({
      success: true,
      prescriptionId: prescription._id,
      imageUrl: imageUrl,
      medicines: aiMeds,
      doctor: doctor,
      issueDate: issuedDate,
      expiryDate: expiryDate,
      extractionMethod: extractionMethod,
      safetyFlags: safetyFlags,
      status: prescription.status,
      doctorTrustScore,
      handwritingMismatch,
      prescriptionDNA,
      isDuplicateImage,
      duplicateOfPrescriptionId: duplicatePrescription?._id || null,
      geoDistanceKm,
      geoFlag,
      estimatedCompletionTime,
      processingStages,
      aiValidation: {
        isValidPrescription: aiValidation.isValidPrescription,
        confidenceScore,
        rejectionReason,
        flags: combinedFlags,
      },
      message: `Found ${medicines.length} medicine${
        medicines.length !== 1 ? "s" : ""
      } (${extractionMethod === "gemini-flash" ? "🤖 Gemini Flash" : "⚙️ Local Parser"})`,
    });
  } catch (error) {
    console.error("[AI-SCAN] Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Scan failed",
    });
  }
};

export const retryExtraction = async (req, res) => {
  try {
    const { ocrText } = req.body;

    if (!ocrText) {
      return res.status(400).json({
        success: false,
        message: "OCR text required",
      });
    }

    const medicines = normalizeMedicines(sharedParseMedicines(ocrText));
    const doctor = extractDoctor(ocrText);
    const issuedDate = extractDate(ocrText);

    return res.json({
      success: true,
      medicines,
      doctor,
      issuedDate,
    });
  } catch (error) {
    console.error("[AI-SCAN] Retry error:", error);
    return res.status(500).json({
      success: false,
      message: "Extraction failed",
    });
  }
};

