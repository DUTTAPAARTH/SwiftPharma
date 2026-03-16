import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import {
  answerMedicineQuestion,
  clearChatHistory,
  getChatHistory,
  getAssistantProviderStatus,
} from "../controllers/assistantController.js";

const router = express.Router();

router.post("/ask", authenticate, answerMedicineQuestion);
// Keep legacy route for backward compatibility
router.post("/medicine", authenticate, answerMedicineQuestion);
router.get("/providers", authenticate, getAssistantProviderStatus);
router.get("/history", authenticate, getChatHistory);
router.delete("/history", authenticate, clearChatHistory);

export default router;
