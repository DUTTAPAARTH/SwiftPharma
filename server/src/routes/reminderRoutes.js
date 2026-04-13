import { Router } from "express";
import {
  createReminder,
  getMyReminders,
  getTodayReminders,
  logDose,
  updateReminder,
  deleteReminder,
  getAdherenceStats,
} from "../controllers/reminderController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.post("/", createReminder);
router.get("/", getMyReminders);
router.get("/today", getTodayReminders);
router.get("/stats", getAdherenceStats);
router.post("/:id/log", logDose);
router.patch("/:id", updateReminder);
router.delete("/:id", deleteReminder);

export default router;
