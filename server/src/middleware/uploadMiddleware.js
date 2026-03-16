import fs from "fs";
import path from "path";
import multer from "multer";

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const createStorage = (folderName) => {
  const uploadDir = path.resolve(process.cwd(), "uploads", folderName);
  ensureDir(uploadDir);

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      const safeName = `${folderName}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, safeName);
    },
  });
};

const createUpload = (folderName, allowedMimeTypes) =>
  multer({
    storage: createStorage(folderName),
    fileFilter: (req, file, cb) => {
      if (allowedMimeTypes.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error("Unsupported file type"));
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  });

const prescriptionUpload = createUpload("prescriptions", [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
]);

const productUpload = createUpload("products", [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export const uploadPrescriptionFiles = prescriptionUpload.array("images", 5);
export const uploadProductImage = productUpload.single("image");
