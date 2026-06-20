import { Router } from "express";
import {
  listAssignedOrders,
  upsertDeliveryLocation,
  updateDelivery,
} from "../controllers/deliveryController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";

const router = Router();
router.get(
  "/orders",
  authenticate,
  requireRole("delivery"),
  listAssignedOrders,
);
router.patch(
  "/orders/:id",
  authenticate,
  requireRole("delivery"),
  updateDelivery,
);
router.post(
  "/location",
  authenticate,
  requireRole("delivery"),
  upsertDeliveryLocation,
);
export default router;

