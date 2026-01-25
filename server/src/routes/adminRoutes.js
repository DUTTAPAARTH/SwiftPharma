import { Router } from "express";
import {
  adminDashboard,
  adminListPrescriptions,
} from "../controllers/adminController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.use(authenticate, requireRole("admin"));
router.get("/dashboard", adminDashboard);
router.get("/prescriptions", adminListPrescriptions);
export default router;
