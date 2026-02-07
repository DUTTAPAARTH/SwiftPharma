import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { answerMedicineQuestion } from "../controllers/assistantController.js";

const router = express.Router();

router.post("/medicine", authenticate, answerMedicineQuestion);

export default router;
