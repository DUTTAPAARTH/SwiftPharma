import express from "express";
import {
  scanPrescription,
  retryExtraction,
} from "../controllers/aiScanController.js";
import multer from "multer";
import path from "path";
import { authenticate } from "../middleware/authMiddleware.js";

// Multer configuration for AI scan
const uploadsDir = path.resolve(process.cwd(), "uploads", "prescriptions");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `ai-scan-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Only JPG/PNG images allowed"));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = express.Router();

// AI prescription scan endpoint - REQUIRES AUTHENTICATION
router.post(
  "/scan-prescription",
  upload.single("image"),
  authenticate,
  scanPrescription
);

// Retry extraction with manual OCR text - REQUIRES AUTHENTICATION
router.post("/retry-extraction", authenticate, retryExtraction);

export default router;
