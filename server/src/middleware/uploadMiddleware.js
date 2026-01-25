import fs from "fs";
import path from "path";
import multer from "multer";

const uploadsDir = path.resolve(process.cwd(), "uploads", "prescriptions");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  return cb(new Error("Only image/PDF uploads are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Upload helper for prescription images (saves to disk + keeps path for OCR)
export const uploadPrescriptionFiles = upload.array("images", 5);
