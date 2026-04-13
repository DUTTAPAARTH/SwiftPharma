import { Router } from "express";
import {
  listOrders,
  createOrder,
  updateOrderStatus,
  getOrderTracking,
  assignDeliveryAgent,
  updateOrderTrackingLocation,
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
  updateOrderStatus,
);
router.get("/:id/tracking", authenticate, getOrderTracking);
router.post("/:id/assign-agent", authenticate, assignDeliveryAgent);
router.patch("/:id/tracking", authenticate, updateOrderTrackingLocation);
export default router;
