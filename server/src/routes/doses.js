import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { getDoseLogs, logDose } from "../controllers/doseLogController.js";

const router = Router();

router.post("/log", authenticate, logDose);
router.get("/", authenticate, getDoseLogs);

export default router;
