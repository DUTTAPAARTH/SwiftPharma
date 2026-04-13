import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Prescription from "../models/Prescription.js";
import { getPrescriptionLifecycleState } from "../utils/prescriptionLifecycle.js";
import {
  normalizeStatusKey,
  ensureTrackingInitialized,
  appendTrackingEvent,
} from "../utils/orderTracking.js";

const toAddressString = (address = {}) =>
  [address.street, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");

const isPrivilegedRole = (role) => ["admin", "pharmacist"].includes(role);

const isOrderOwner = (orderLike, userLike) => {
  if (!orderLike?.user || !userLike) return false;
  return String(orderLike.user) === String(userLike._id || userLike.id);
};

export const createAutoRefillOrder = async ({
  userId,
  subscriptionId,
  productId,
  quantity,
  price,
  deliveryAddress,
}) => {
  const safeQty = Math.max(1, Number(quantity || 1));
  const safePrice = Number(price || 0);

  const order = await Order.create({
    user: userId,
    items: [
      {
        product: productId,
        quantity: safeQty,
        price: safePrice,
      },
    ],
    status: "Placed",
    address: toAddressString(deliveryAddress) || "Subscription Address",
    payment: {
      method: "auto_refill",
      amount: Number((safePrice * safeQty).toFixed(2)),
    },
    autoRefill: true,
    subscriptionId,
    prescriptionId: null,
  });

  return order;
};

export const validateRxCompliance = async (userId, cartItems = []) => {
  const productIds = cartItems.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } });

  const productMap = new Map(
    products.map((product) => [String(product._id), product]),
  );
  const rxItems = cartItems.filter((item) => {
    const mapped = productMap.get(String(item.product));
    return Boolean(
      item.requiresRx ||
      item.isRx ||
      mapped?.requiresRx ||
      mapped?.isRx ||
      mapped?.prescriptionRequired,
    );
  });

  if (!rxItems.length) {
    return { ok: true, products, prescriptionId: null };
  }

  const rxItemNames = rxItems
    .map(
      (item) =>
        productMap.get(String(item.product))?.name || item.name || "Rx item",
    )
    .filter(Boolean);

  const latestPrescription = await Prescription.findOne({ userId }).sort({
    createdAt: -1,
  });
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const validApprovedPrescription = await Prescription.findOne({
    userId,
    status: "approved",
    isExpired: false,
    approvedAt: { $gte: sixMonthsAgo },
  }).sort({ approvedAt: -1 });

  if (validApprovedPrescription) {
    const approvedLifecycle = getPrescriptionLifecycleState(
      validApprovedPrescription.toObject(),
    );
    if (approvedLifecycle.status === "approved") {
      return {
        ok: true,
        products,
        prescriptionId: validApprovedPrescription._id,
      };
    }
  }

  if (!latestPrescription) {
    return {
      ok: false,
      statusCode: 403,
      error: {
        success: false,
        blocked: true,
        reason: "PRESCRIPTION_REQUIRED",
        message:
          "Your order contains prescription medicines. Please upload a valid prescription and wait for pharmacist approval before placing order.",
        rxItems: rxItemNames,
        action: "UPLOAD_PRESCRIPTION",
      },
    };
  }

  const latestLifecycle = getPrescriptionLifecycleState(
    latestPrescription.toObject(),
  );

  if (
    latestPrescription.status !== latestLifecycle.status ||
    latestPrescription.isExpired !== latestLifecycle.isExpired
  ) {
    latestPrescription.status = latestLifecycle.status;
    latestPrescription.isExpired = latestLifecycle.isExpired;
    latestPrescription.expiryDate = latestLifecycle.expiryDate;
    await latestPrescription.save();
  }

  if (latestLifecycle.status === "approved") {
    return {
      ok: true,
      products,
      prescriptionId: latestPrescription._id,
    };
  }

  if (
    ["pending", "ai_reviewing", "awaiting_pharmacist"].includes(
      latestLifecycle.status,
    )
  ) {
    return {
      ok: false,
      statusCode: 403,
      error: {
        success: false,
        blocked: true,
        reason: "PRESCRIPTION_PENDING",
        message:
          "Your prescription is currently under review. You will be notified once approved. Estimated time: 30 minutes.",
        status: latestLifecycle.status,
        action: "WAIT_FOR_APPROVAL",
      },
    };
  }

  if (["ai_rejected", "rejected"].includes(latestLifecycle.status)) {
    return {
      ok: false,
      statusCode: 403,
      error: {
        success: false,
        blocked: true,
        reason: "PRESCRIPTION_REJECTED",
        message: `Your prescription was rejected. Reason: ${
          latestPrescription.aiRejectionReason ||
          latestPrescription.pharmacistNotes ||
          "Insufficient prescription details"
        }. Please upload a valid prescription issued by a registered doctor.`,
        rejectionReason:
          latestPrescription.aiRejectionReason ||
          latestPrescription.pharmacistNotes ||
          null,
        action: "REUPLOAD_PRESCRIPTION",
      },
    };
  }

  const isExpiredByDate =
    latestLifecycle.status === "expired" ||
    latestLifecycle.isExpired ||
    (latestPrescription.approvedAt &&
      latestPrescription.approvedAt < sixMonthsAgo);

  if (isExpiredByDate) {
    return {
      ok: false,
      statusCode: 403,
      error: {
        success: false,
        blocked: true,
        reason: "PRESCRIPTION_EXPIRED",
        message:
          "Your prescription has expired. Prescriptions are valid for 6 months. Please get a new prescription from your doctor.",
        action: "REUPLOAD_PRESCRIPTION",
      },
    };
  }

  return {
    ok: false,
    statusCode: 403,
    error: {
      success: false,
      blocked: true,
      reason: "PRESCRIPTION_REQUIRED",
      message:
        "Your order contains prescription medicines. Please upload a valid prescription and wait for pharmacist approval before placing order.",
      rxItems: rxItemNames,
      action: "UPLOAD_PRESCRIPTION",
    },
  };
};

export const listOrders = async (req, res) => {
  try {
    const filter = req.user?.role === "admin" ? {} : { user: req.user._id };
    const orders = await Order.find(filter)
      .populate("items.product")
      .populate("prescriptionId")
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    console.error("listOrders error", error);
    return res.status(500).json({ message: "Failed to list orders" });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { items = [], address, payment, prescriptionId } = req.body;
    if (!items.length) return res.status(400).json({ message: "No items" });
    const compliance = await validateRxCompliance(
      req.user.id || req.user._id,
      items,
    );
    if (!compliance.ok) {
      return res.status(compliance.statusCode || 403).json(compliance.error);
    }

    const order = await Order.create({
      user: req.user._id,
      items: items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        price: i.price,
      })),
      status: "Placed",
      address,
      payment,
      prescriptionId: compliance.prescriptionId || prescriptionId || null,
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error("createOrder error", error);
    return res.status(500).json({ message: "Failed to create order" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await Order.findById(req.params.id);
    if (!updated) return res.status(404).json({ message: "Not found" });

    updated.status = status;
    const normalized = normalizeStatusKey(status);
    if (normalized === "out_for_delivery") {
      ensureTrackingInitialized(updated);
      appendTrackingEvent(updated, "out_for_delivery", "Order is on the way");
    }
    if (normalized === "delivered" && updated.tracking) {
      ensureTrackingInitialized(updated);
      if (updated.tracking.destinationLocation) {
        updated.tracking.currentLocation = {
          lat: updated.tracking.destinationLocation.lat,
          lng: updated.tracking.destinationLocation.lng,
          updatedAt: new Date(),
        };
      }
      updated.tracking.estimatedDeliveryTime = new Date();
      appendTrackingEvent(updated, "delivered", "Order delivered successfully");
    }
    await updated.save();

    return res.json(updated);
  } catch (error) {
    console.error("updateOrderStatus error", error);
    return res.status(500).json({ message: "Failed to update order" });
  }
};

export const getOrderTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select(
      "user status address tracking createdAt updatedAt",
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!isPrivilegedRole(req.user?.role) && !isOrderOwner(order, req.user)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const currentStatus = normalizeStatusKey(order.status);
    if (!order.tracking && currentStatus !== "delivered") {
      return res.status(404).json({ message: "Tracking not available yet" });
    }

    return res.json({
      success: true,
      orderId: order._id,
      status: order.status,
      deliveryAddress: order.address,
      tracking: order.tracking || null,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error("getOrderTracking error", error);
    return res.status(500).json({ message: "Failed to fetch tracking" });
  }
};

export const assignDeliveryAgent = async (req, res) => {
  try {
    if (!isPrivilegedRole(req.user?.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const agentName = String(req.body?.agentName || "").trim();
    if (!agentName) {
      return res.status(400).json({ message: "Agent name is required" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const status = normalizeStatusKey(order.status);
    if (status !== "out_for_delivery") {
      return res.status(400).json({
        message: "Delivery agent can only be assigned after out for delivery",
      });
    }

    ensureTrackingInitialized(order);
    order.tracking.deliveryAgentName = agentName;
    order.tracking.currentLocation.updatedAt = new Date();

    appendTrackingEvent(order, "agent_assigned", `Assigned to ${agentName}`);
    await order.save();

    return res.json({
      success: true,
      orderId: order._id,
      tracking: order.tracking,
    });
  } catch (error) {
    console.error("assignDeliveryAgent error", error);
    return res.status(500).json({ message: "Failed to assign delivery agent" });
  }
};

export const updateOrderTrackingLocation = async (req, res) => {
  try {
    if (!isPrivilegedRole(req.user?.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const etaMinutes = Number(req.body?.etaMinutes);
    const note = String(req.body?.note || "").trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res
        .status(400)
        .json({ message: "Valid lat and lng are required" });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: "Coordinates out of range" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    ensureTrackingInitialized(order);
    order.tracking.currentLocation = {
      lat,
      lng,
      updatedAt: new Date(),
    };

    if (Number.isFinite(etaMinutes) && etaMinutes >= 0) {
      order.tracking.estimatedDeliveryTime = new Date(
        Date.now() + etaMinutes * 60 * 1000,
      );
    }

    if (note) {
      appendTrackingEvent(order, "location_update", note);
    }

    await order.save();
    return res.json({ success: true, tracking: order.tracking });
  } catch (error) {
    console.error("updateOrderTrackingLocation error", error);
    return res.status(500).json({ message: "Failed to update tracking" });
  }
};
