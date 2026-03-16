import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { checkDrugInteractions } from "../controllers/interactionController.js";

const router = express.Router();

router.post("/check", authenticate, checkDrugInteractions);

export default router;
