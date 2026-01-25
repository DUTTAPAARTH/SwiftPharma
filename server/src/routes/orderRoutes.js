import { Router } from "express";
import {
  listOrders,
  createOrder,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.get("/", authenticate, listOrders);
router.post("/", authenticate, createOrder);
router.patch(
  "/:id/status",
  authenticate,
  requireRole("admin"),
  updateOrderStatus
);
export default router;
