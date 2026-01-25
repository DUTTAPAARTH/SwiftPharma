import { Router } from "express";
import {
  listAssignedOrders,
  updateDelivery,
} from "../controllers/deliveryController.js";

const router = Router();
router.get("/orders", listAssignedOrders);
router.patch("/orders/:id", updateDelivery);
export default router;
