import fs from "fs";
import path from "path";
import sharp from "sharp";
import Prescription from "../models/Prescription.js";
import {
  runOcr as sharedRunOcr,
  parseMedicines as sharedParseMedicines,
} from "./prescriptionController.js";
import { parseWithGemini } from "../services/geminiService.js";
import parsePrescriptionOCR from "../services/prescriptionParser.js";

const uploadsDir = path.resolve(process.cwd(), "uploads", "prescriptions");

const ensureUploadsDir = async () => {
  await fs.promises.mkdir(uploadsDir, { recursive: true });
};

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
      id: `med-${Date.now()}-${Math.random()}`,
      name: med.name || "Unknown",
      strength: med.strength || "",
      dosage: med.dosage || "Tablet",
      frequency: med.frequency || "As directed",
      duration: med.duration || "",
      quantity: med.quantity || 1,
      notes: med.notes || "",
      warnings: med.warnings || [],
    }));
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

    // Step 2: Try Gemini API (FREE - Fast & Accurate)
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

      // Convert Gemini output to medicines array
      // IMPORTANT: Keep medicines even with null names (low confidence fallback)
      medicines = (parsedData.medicines || [])
        .filter((m) => m)
        .map((med) => ({
          id: `med-${Date.now()}-${Math.random()}`,
          name: med.name || "Unknown",
          strength: med.strength || "",
          dosage: "Tablet",
          frequency: med.dosage_pattern || "As directed",
          duration: med.duration_days ? `${med.duration_days} days` : "",
          quantity: 1,
          notes: med.confidence < 0.8 ? "Low confidence - please verify" : "",
          warnings: [],
          confidence: med.confidence || 0.8,
        }));

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

      // IMPORTANT: Keep medicines even with null names (low confidence fallback)
      medicines = (parsedData.medicines || [])
        .filter((m) => m)
        .map((med) => ({
          id: `med-${Date.now()}-${Math.random()}`,
          name: med.name || "Unknown",
          strength: med.strength || "",
          dosage: "Tablet",
          frequency: med.dosage_pattern || "As directed",
          duration: med.duration_days ? `${med.duration_days} days` : "",
          quantity: 1,
          notes:
            med.confidence < 0.8
              ? "Low confidence - extracted locally, please verify"
              : "",
          warnings: [],
          confidence: med.confidence || 0.7,
        }));

      doctor = {
        name: parsedData.doctor?.name,
        reg_no: parsedData.doctor?.qualification,
      };

      if (parsedData.prescription_date) {
        issuedDate = new Date(parsedData.prescription_date);
      }

      safetyFlags = parsedData.safety_flags;
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

    const expiryDate = new Date(issuedDate);
    expiryDate.setMonth(expiryDate.getMonth() + 6);

    // SECURITY: Always use authenticated user's ID - never accept from request body
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Please log in to upload prescriptions",
        code: "AUTH_REQUIRED",
      });
    }

    // Save prescription record
    const prescription = await Prescription.create({
      userId: req.user.id,
      images: [imageUrl],
      ocrText,
      doctorName: doctor.name,
      issueDate: issuedDate,
      expiryDate,
      status: "pending",
      notes: req.body.notes || "",
    });

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
      medicines: medicines,
      doctor: doctor,
      issueDate: issuedDate,
      expiryDate: expiryDate,
      extractionMethod: extractionMethod,
      safetyFlags: safetyFlags,
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

    const medicines = extractMedicines(ocrText);
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
