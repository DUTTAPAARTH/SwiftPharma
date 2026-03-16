import { Router } from "express";
import {
  uploadPrescription,
  validatePrescription,
  getUserPrescriptions,
  reuploadPrescription,
  downloadPrescription,
  adminReviewPrescription,
  testOcr,
} from "../controllers/prescriptionController.js";
import { getMyLatestPrescription } from "../controllers/prescriptionStatusController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { uploadPrescriptionFiles } from "../middleware/uploadMiddleware.js";

const router = Router();

// All prescription routes require authentication
router.post(
  "/upload",
  authenticate,
  uploadPrescriptionFiles,
  uploadPrescription,
);

router.get("/:id/validate", authenticate, validatePrescription);

// Changed: Use req.user.id instead of URL param - more secure
router.get("/my-prescriptions", authenticate, getUserPrescriptions);
router.get("/my-latest", authenticate, getMyLatestPrescription);

router.get("/test-ocr", testOcr); // Public test endpoint

router.post(
  "/:id/reupload",
  authenticate,
  uploadPrescriptionFiles,
  reuploadPrescription,
);

router.get("/:id/download", authenticate, downloadPrescription);

router.patch(
  "/:id/review",
  authenticate,
  requireRole("admin"),
  adminReviewPrescription,
);

export default router;
