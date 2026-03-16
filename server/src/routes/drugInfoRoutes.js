import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { getDrugInfoByName } from "../controllers/drugInfoController.js";

const router = express.Router();

router.get("/:medicineName", authenticate, getDrugInfoByName);

export default router;
