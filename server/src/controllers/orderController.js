import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Prescription from "../models/Prescription.js";
import mongoose from "mongoose";
import { getPrescriptionLifecycleState } from "../utils/prescriptionLifecycle.js";
import {
  normalizeStatusKey,
  ensureTrackingInitialized,
  appendTrackingEvent,
} from "../utils/orderTracking.js";
import AgentLocation from "../models/AgentLocation.js";
import { ORDER_STATUS } from "../utils/constants.js";

const OUT_FOR_DELIVERY_STATUS =
  ORDER_STATUS.find(
    (value) => normalizeStatusKey(value) === "out_for_delivery",
  ) || "Out for Delivery";

const toPositiveNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const parseBooleanLike = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
};

const getDeliveryRadiusPolicyKm = () => {
  const strictKm = toPositiveNumber(
    process.env.DELIVERY_AGENT_RADIUS_STRICT_KM,
    10,
  );
  const defaultKm = Math.max(
    strictKm,
    toPositiveNumber(process.env.DELIVERY_AGENT_RADIUS_DEFAULT_KM, 12),
  );
  const emergencyKm = Math.max(
    defaultKm,
    toPositiveNumber(process.env.DELIVERY_AGENT_RADIUS_EMERGENCY_KM, 15),
  );

  return {
    strictKm,
    defaultKm,
    emergencyKm,
  };
};

const toAddressString = (address = {}) =>
  [address.street, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");

const isPrivilegedRole = (role) => ["admin", "pharmacist"].includes(role);

const isOrderOwner = (orderLike, userLike) => {
  if (!orderLike?.user || !userLike) return false;
  return String(orderLike.user) === String(userLike._id || userLike.id);
};

const normalizeOrderHistoryStatus = (status) => {
  const normalized = normalizeStatusKey(status);
  if (["placed", "pending"].includes(normalized)) return "pending";
  if (["approved", "packed", "confirmed", "processing"].includes(normalized)) {
    return "confirmed";
  }
  if (normalized === "out_for_delivery") return "out_for_delivery";
  if (normalized === "delivered") return "delivered";
  if (normalized === "cancelled") return "cancelled";
  return normalized || "pending";
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
    totalAmount: Number((safePrice * safeQty).toFixed(2)),
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
        smartReuse: {
          skipUpload: true,
          autoAttached: true,
          source: "approved_recent",
        },
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
      smartReuse: {
        skipUpload: true,
        autoAttached: true,
        source: "latest_approved",
      },
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

export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const orders = await Order.find({ user: userId })
      .populate("items.product", "name")
      .sort({ createdAt: -1 });

    return res.json({
      orders: orders.map((order) => {
        const itemRows = Array.isArray(order.items)
          ? order.items.map((item) => ({
              name: item?.name || item?.product?.name || "Medicine",
              quantity: Number(item?.quantity || 1),
              price: Number(item?.price || 0),
            }))
          : [];

        const computedTotal = itemRows.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        return {
          _id: order._id,
          userId: order.user,
          items: itemRows,
          totalAmount:
            Number(order.totalAmount || 0) ||
            Number(order?.payment?.amount || 0) ||
            Number(computedTotal || 0),
          status: normalizeOrderHistoryStatus(order.status),
          createdAt: order.createdAt,
        };
      }),
    });
  } catch (error) {
    console.error("getMyOrders error", error);
    return res.status(500).json({ message: "Failed to fetch order history" });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { items = [], address, payment, prescriptionId, deliveryLocation } = req.body;
    if (!items.length) return res.status(400).json({ message: "No items" });

    const invalidItems = items.filter(
      (item) => !mongoose.Types.ObjectId.isValid(item?.product),
    );
    if (invalidItems.length) {
      return res.status(400).json({
        message:
          "Some cart medicines are not linked to valid catalog products. Please remove them and add catalog alternatives before checkout.",
      });
    }

    const compliance = await validateRxCompliance(
      req.user.id || req.user._id,
      items,
    );
    if (!compliance.ok) {
      return res.status(compliance.statusCode || 403).json(compliance.error);
    }

    const normalizedItems = items.map((i) => ({
      product: i.product,
      name: String(i.name || "").trim(),
      quantity: Number(i.quantity || 1),
      price: Number(i.price || 0),
    }));

    const calculatedTotalAmount = Number(
      normalizedItems
        .reduce((sum, item) => sum + item.price * item.quantity, 0)
        .toFixed(2),
    );

    const deliveryLat = Number(deliveryLocation?.lat);
    const deliveryLng = Number(deliveryLocation?.lng);
    const hasValidDeliveryLocation =
      Number.isFinite(deliveryLat) &&
      Number.isFinite(deliveryLng) &&
      deliveryLat >= -90 &&
      deliveryLat <= 90 &&
      deliveryLng >= -180 &&
      deliveryLng <= 180;

    const order = await Order.create({
      user: req.user._id,
      items: normalizedItems,
      status: "Placed",
      address,
      payment,
      totalAmount:
        Number(payment?.amount || 0) > 0
          ? Number(payment.amount)
          : calculatedTotalAmount,
      tracking: hasValidDeliveryLocation
        ? {
            destinationLocation: {
              lat: deliveryLat,
              lng: deliveryLng,
            },
          }
        : undefined,
      prescriptionId: compliance.prescriptionId || prescriptionId || null,
    });

    return res.status(201).json({
      ...order.toObject(),
      rxAutoAttached: Boolean(compliance.smartReuse?.autoAttached),
      rxSmartReuse: compliance.smartReuse || null,
    });
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
      if (!updated.trackingStartedAt) {
        updated.trackingStartedAt = new Date();
      }
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

export const getOrderAgentLocation = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    }).select("_id status assignedAgent trackingStartedAt");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (String(order.status) !== String(OUT_FOR_DELIVERY_STATUS)) {
      return res.json({
        tracking: false,
        reason: "Order is not yet out for delivery",
        status: order.status,
      });
    }

    if (!order.assignedAgent) {
      return res.json({
        tracking: false,
        reason: "Agent not yet assigned",
      });
    }

    const agentLocation = await AgentLocation.findOne({
      agentId: order.assignedAgent,
    }).select("location updatedAt");

    if (!agentLocation?.location?.coordinates?.length) {
      return res.json({
        tracking: true,
        agentLocation: null,
        reason: "Agent location not available yet",
      });
    }

    const [lng, lat] = agentLocation.location.coordinates;
    return res.json({
      tracking: true,
      agentLocation: {
        lat,
        lng,
        updatedAt: agentLocation.updatedAt,
      },
      orderId: order._id,
      orderStatus: order.status,
      estimatedArrival: order.trackingStartedAt
        ? new Date(new Date(order.trackingStartedAt).getTime() + 30 * 60000)
        : null,
    });
  } catch (error) {
    console.error("getOrderAgentLocation error", error);
    return res.status(500).json({ message: "Failed to fetch agent location" });
  }
};

export const getActiveTracking = async (req, res) => {
  try {
    const order = await Order.findOne({
      user: req.user._id,
      status: OUT_FOR_DELIVERY_STATUS,
    })
      .sort({ updatedAt: -1 })
      .select(
        "_id items totalAmount status assignedAgent trackingStartedAt tracking.currentLocation tracking.destinationLocation tracking.estimatedDeliveryTime",
      )
      .populate("items.product", "name")
      .populate("assignedAgent", "name");

    if (!order) {
      return res.json({ hasActiveTracking: false });
    }

    let agentLocationPayload = null;
    if (order.assignedAgent) {
      const agentLocation = await AgentLocation.findOne({
        agentId: order.assignedAgent._id || order.assignedAgent,
      }).select("location updatedAt");

      if (agentLocation?.location?.coordinates?.length) {
        const [lng, lat] = agentLocation.location.coordinates;
        agentLocationPayload = {
          lat,
          lng,
          updatedAt: agentLocation.updatedAt,
        };
      }
    }

    if (!agentLocationPayload && order?.tracking?.currentLocation) {
      const lat = Number(order.tracking.currentLocation.lat);
      const lng = Number(order.tracking.currentLocation.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        agentLocationPayload = {
          lat,
          lng,
          updatedAt:
            order.tracking.currentLocation.updatedAt ||
            order.updatedAt ||
            new Date(),
        };
      }
    }

    if (!agentLocationPayload && order?.tracking?.destinationLocation) {
      const lat = Number(order.tracking.destinationLocation.lat);
      const lng = Number(order.tracking.destinationLocation.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        agentLocationPayload = {
          lat,
          lng,
          updatedAt: order.updatedAt || new Date(),
        };
      }
    }

    const firstName = order.items?.[0]?.product?.name || "Medicine";
    const totalCount = Array.isArray(order.items) ? order.items.length : 0;
    const itemSummary =
      totalCount > 1 ? `${firstName} + ${totalCount - 1} more` : firstName;
    const totalAmount = Array.isArray(order.items)
      ? order.items.reduce(
          (sum, item) =>
            sum + Number(item.price || 0) * Number(item.quantity || 1),
          0,
        )
      : 0;

    return res.json({
      hasActiveTracking: true,
      order: {
        _id: order._id,
        items: itemSummary,
        totalAmount,
        status: order.status,
        assignedAgent: order.assignedAgent
          ? { name: order.assignedAgent.name }
          : null,
      },
      agentLocation: agentLocationPayload,
      estimatedArrival:
        order?.tracking?.estimatedDeliveryTime ||
        (order.trackingStartedAt
          ? new Date(new Date(order.trackingStartedAt).getTime() + 30 * 60000)
          : null),
    });
  } catch (error) {
    console.error("getActiveTracking error", error);
    return res.status(500).json({ message: "Failed to fetch active tracking" });
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

    const radiusPolicy = getDeliveryRadiusPolicyKm();
    const allowEmergencyDefault = parseBooleanLike(
      process.env.DELIVERY_AGENT_ALLOW_EMERGENCY_DEFAULT,
      true,
    );
    const allowEmergency = parseBooleanLike(
      req.body?.allowEmergency,
      allowEmergencyDefault,
    );
    const maxDistanceKm = allowEmergency
      ? radiusPolicy.emergencyKm
      : radiusPolicy.defaultKm;

    ensureTrackingInitialized(order);

    const destinationLat = Number(order?.tracking?.destinationLocation?.lat);
    const destinationLng = Number(order?.tracking?.destinationLocation?.lng);

    if (!Number.isFinite(destinationLat) || !Number.isFinite(destinationLng)) {
      return res.status(400).json({
        message: "Customer destination location is unavailable for this order",
      });
    }

    const agentRegex = new RegExp(agentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const candidates = await AgentLocation.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [destinationLng, destinationLat],
          },
          distanceField: "distanceMeters",
          spherical: true,
          maxDistance: maxDistanceKm * 1000,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "agentId",
          foreignField: "_id",
          as: "agent",
        },
      },
      { $unwind: "$agent" },
      {
        $match: {
          "agent.role": "delivery",
          "agent.suspended": { $ne: true },
          "agent.name": { $regex: agentRegex },
        },
      },
      { $sort: { distanceMeters: 1 } },
      { $limit: 1 },
    ]);

    const selected = candidates[0];
    if (!selected) {
      return res.status(400).json({
        message: allowEmergency
          ? `No nearby delivery agent found within ${radiusPolicy.emergencyKm} km of customer location for the provided name`
          : `No nearby delivery agent found within ${radiusPolicy.defaultKm} km. Enable emergency radius up to ${radiusPolicy.emergencyKm} km if needed`,
      });
    }

    order.assignedAgent = selected.agent._id;
    order.tracking.deliveryAgentName = selected.agent.name;
    order.tracking.currentLocation = {
      lat: Number(selected.location?.coordinates?.[1]),
      lng: Number(selected.location?.coordinates?.[0]),
      updatedAt: selected.updatedAt || new Date(),
    };
    order.tracking.currentLocation.updatedAt = new Date();

    const distanceKm = Number((Number(selected.distanceMeters || 0) / 1000).toFixed(2));
    const assignmentBand =
      distanceKm <= radiusPolicy.strictKm
        ? "strict"
        : distanceKm <= radiusPolicy.defaultKm
          ? "default"
          : "emergency";

    appendTrackingEvent(
      order,
      "agent_assigned",
      `Assigned to ${selected.agent.name} (${distanceKm} km from customer, ${assignmentBand} radius band)`,
    );
    await order.save();

    return res.json({
      success: true,
      orderId: order._id,
      assignedAgent: {
        id: selected.agent._id,
        name: selected.agent.name,
        distanceKm,
        assignmentBand,
      },
      radiusPolicy: {
        ...radiusPolicy,
        allowEmergency,
      },
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
