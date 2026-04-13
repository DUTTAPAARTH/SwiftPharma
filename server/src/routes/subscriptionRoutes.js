import { Router } from "express";
import {
  createSubscription,
  getUserSubscriptions,
  getSubscriptionById,
  updateSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
} from "../controllers/subscriptionController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

router.post("/", createSubscription);
router.get("/", getUserSubscriptions);
router.get("/:id", getSubscriptionById);
router.patch("/:id", updateSubscription);
router.patch("/:id/pause", pauseSubscription);
router.patch("/:id/resume", resumeSubscription);
router.patch("/:id/cancel", cancelSubscription);

export default router;
