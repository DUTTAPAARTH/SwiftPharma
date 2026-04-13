import Prescription from "../models/Prescription.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import fs from "fs";
import path from "path";
import {
  getPrescriptionLifecycleState,
  getRestoredPendingStatus,
  PRESCRIPTION_REVIEW_WINDOW_MS,
} from "../utils/prescriptionLifecycle.js";
import {
  ensureTrackingInitialized,
  appendTrackingEvent,
} from "../utils/orderTracking.js";

const ORDER_STATUS_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const LEGACY_TO_CANONICAL_STATUS = {
  placed: "pending",
  approved: "confirmed",
  packed: "processing",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "cancelled",
};

const CANONICAL_TO_DB_STATUS = {
  pending: "Placed",
  confirmed: "Approved",
  processing: "Packed",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const normalizeStatusKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const toCanonicalStatus = (value) => {
  const normalized = normalizeStatusKey(value);
  if (ORDER_STATUS_FLOW.includes(normalized)) return normalized;
  return LEGACY_TO_CANONICAL_STATUS[normalized] || "pending";
};

const FORWARD_STATUS_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
];

const allowedNextStatuses = (current) => {
  if (current === "cancelled" || current === "delivered") return [];
  const idx = FORWARD_STATUS_FLOW.indexOf(current);
  if (idx === -1) return [];
  // Allow jumping to any forward status (not just the next one)
  return [...FORWARD_STATUS_FLOW.slice(idx + 1), "cancelled"];
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return value.toLowerCase() === "true";
};

const parseNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getOrderAmount = (orderLike) => {
  const paymentAmount = parseNumber(orderLike?.payment?.amount, NaN);
  if (Number.isFinite(paymentAmount)) return paymentAmount;
  const items = Array.isArray(orderLike?.items) ? orderLike.items : [];
  return items.reduce(
    (sum, item) =>
      sum + parseNumber(item?.price, 0) * parseNumber(item?.quantity, 0),
    0,
  );
};

const completedOrderStatuses = [
  "Delivered",
  "delivered",
  "completed",
  "Completed",
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const adminDashboard = async (req, res) => {
  return getDashboardStats(req, res);
};

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      pendingPrescriptions,
      totalUsers,
      ordersToday,
      newUsersThisWeek,
      prescriptionsToday,
      revenueRows,
    ] = await Promise.all([
      Order.countDocuments({}),
      Prescription.countDocuments({
        status: { $in: ["pending", "awaiting_pharmacist"] },
      }),
      User.countDocuments({ role: { $in: ["user", "customer"] } }),
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({
        role: { $in: ["user", "customer"] },
        createdAt: { $gte: weekStart },
      }),
      Prescription.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.aggregate([
        {
          $match: {
            status: { $in: ["delivered", "completed", "Delivered"] },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $ifNull: ["$payment.amount", 0] } },
          },
        },
      ]),
    ]);

    const totalRevenue = Number(revenueRows?.[0]?.totalRevenue || 0);

    return res.json({
      success: true,
      stats: {
        totalOrders,
        pendingPrescriptions,
        totalUsers,
        totalRevenue,
        ordersToday,
        newUsersThisWeek,
        prescriptionsToday,
      },
    });
  } catch (error) {
    console.error("getDashboardStats error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load dashboard stats" });
  }
};

// ─── Prescription Queue (pending + awaiting_pharmacist) ───────────────────────

export const getPrescriptionQueue = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const reviewCutoff = new Date(Date.now() - PRESCRIPTION_REVIEW_WINDOW_MS);
    const candidates = await Prescription.find({
      $or: [
        { status: { $in: ["pending", "awaiting_pharmacist", "ai_reviewing"] } },
        {
          status: "expired",
          createdAt: { $gte: reviewCutoff },
          approvedAt: null,
          rejectedAt: null,
        },
      ],
    })
      .populate("userId", "name email")
      .sort({ createdAt: 1 });

    const pendingWrites = [];
    const queueItems = [];

    for (const rx of candidates) {
      const lifecycle = getPrescriptionLifecycleState(rx.toObject());

      if (
        rx.status !== lifecycle.status ||
        rx.isExpired !== lifecycle.isExpired
      ) {
        rx.status = lifecycle.status;
        rx.isExpired = lifecycle.isExpired;
        rx.expiryDate = lifecycle.expiryDate;
        pendingWrites.push(rx.save());
      }

      if (
        !["pending", "awaiting_pharmacist", "ai_reviewing"].includes(
          lifecycle.status,
        )
      ) {
        continue;
      }

      queueItems.push({
        _id: rx._id,
        imageUrl: rx.images?.[0] || null,
        images: rx.images || [],
        status: lifecycle.status,
        aiConfidenceScore: rx.aiConfidenceScore ?? null,
        aiExtractedMedicines: rx.aiExtractedMedicines || [],
        aiRejectionReason: rx.aiRejectionReason || null,
        aiFlags: rx.aiFlags || [],
        doctorName: rx.doctorName || null,
        createdAt: rx.createdAt,
        user: {
          _id: rx.userId?._id || null,
          name: rx.userId?.name || "Unknown User",
          email: rx.userId?.email || "N/A",
        },
      });
    }

    if (pendingWrites.length) {
      await Promise.allSettled(pendingWrites);
    }

    const total = queueItems.length;
    const prescriptions = queueItems.slice(skip, skip + limit);

    return res.json({
      success: true,
      prescriptions,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("getPrescriptionQueue error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load prescription queue" });
  }
};

// TEMP DEBUG: status distribution to verify queue intake from uploads
export const getPrescriptionDebug = async (_req, res) => {
  try {
    const [total, grouped] = await Promise.all([
      Prescription.countDocuments({}),
      Prescription.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byStatus = {
      pending: 0,
      awaiting_pharmacist: 0,
      approved: 0,
      rejected: 0,
    };

    for (const row of grouped) {
      const key = String(row?._id || "");
      if (Object.prototype.hasOwnProperty.call(byStatus, key)) {
        byStatus[key] = Number(row?.count || 0);
      }
    }

    return res.json({
      success: true,
      total,
      byStatus,
    });
  } catch (error) {
    console.error("getPrescriptionDebug error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch prescription debug stats",
    });
  }
};

export const fixExpiredPrescriptions = async (_req, res) => {
  try {
    const reviewCutoff = new Date(Date.now() - PRESCRIPTION_REVIEW_WINDOW_MS);

    const targets = await Prescription.find({
      status: "expired",
      createdAt: { $gte: reviewCutoff },
      approvedAt: null,
      rejectedAt: null,
    }).select("_id aiValidated aiConfidenceScore");

    if (!targets.length) {
      return res.json({ success: true, fixed: 0 });
    }

    const operations = targets.map((rx) => ({
      updateOne: {
        filter: { _id: rx._id },
        update: {
          $set: {
            status: getRestoredPendingStatus(rx),
            isExpired: false,
          },
        },
      },
    }));

    const result = await Prescription.bulkWrite(operations);
    const fixed = Number(result.modifiedCount || 0);

    return res.json({ success: true, fixed });
  } catch (error) {
    console.error("fixExpiredPrescriptions error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fix expired prescriptions",
    });
  }
};

// Alias kept for backward compatibility
export const pharmacistQueue = getPrescriptionQueue;

// ─── All Prescriptions (filters + pagination) ─────────────────────────────────

export const getAllPrescriptions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      const safe = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(safe, "i");
      const users = await User.find({
        $or: [{ name: re }, { email: re }],
      }).select("_id");
      filter.userId = { $in: users.map((u) => u._id) };
    }

    const [items, total] = await Promise.all([
      Prescription.find(filter)
        .populate("userId", "name email")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Prescription.countDocuments(filter),
    ]);

    const prescriptions = items.map((rx) => ({
      _id: rx._id,
      imageUrl: rx.images?.[0] || null,
      images: rx.images || [],
      status: rx.status,
      aiConfidenceScore: rx.aiConfidenceScore ?? null,
      aiExtractedMedicines: rx.aiExtractedMedicines || [],
      aiRejectionReason: rx.aiRejectionReason || null,
      aiFlags: rx.aiFlags || [],
      pharmacistNotes: rx.pharmacistNotes || null,
      doctorName: rx.doctorName || null,
      createdAt: rx.createdAt,
      approvedAt: rx.approvedAt || null,
      rejectedAt: rx.rejectedAt || null,
      reviewedBy: rx.reviewedBy
        ? { name: rx.reviewedBy.name, email: rx.reviewedBy.email }
        : null,
      user: {
        _id: rx.userId?._id || null,
        name: rx.userId?.name || "Unknown User",
        email: rx.userId?.email || "N/A",
      },
    }));

    return res.json({
      success: true,
      prescriptions,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("getAllPrescriptions error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load prescriptions" });
  }
};

// ─── Single Prescription ──────────────────────────────────────────────────────

export const getSinglePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate("userId", "name email phone")
      .populate("reviewedBy", "name email");

    if (!prescription) {
      return res
        .status(404)
        .json({ success: false, message: "Prescription not found" });
    }
    return res.json({ success: true, prescription });
  } catch (error) {
    console.error("getSinglePrescription error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load prescription" });
  }
};

// ─── List (backward compat, used by admin dashboard) ─────────────────────────

export const adminListPrescriptions = async (req, res) => {
  try {
    const data = await Prescription.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    return res.json(data);
  } catch (error) {
    console.error("adminListPrescriptions error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load prescriptions" });
  }
};

// ─── Approve ──────────────────────────────────────────────────────────────────

export const approvePrescription = async (req, res) => {
  try {
    const updated = await Prescription.findByIdAndUpdate(
      req.params.id,
      {
        status: "approved",
        approvedAt: new Date(),
        rejectedAt: null,
        pharmacistNotes: req.body.notes || "",
        aiRejectionReason: null,
        isExpired: false,
        reviewedBy: req.user._id,
      },
      { new: true },
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Prescription not found" });
    }

    return res.json({ success: true, prescription: updated });
  } catch (error) {
    console.error("approvePrescription error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to approve prescription" });
  }
};

// ─── Reject ───────────────────────────────────────────────────────────────────

export const rejectPrescription = async (req, res) => {
  try {
    const reason = String(req.body.reason || "").trim();
    if (!reason) {
      return res
        .status(400)
        .json({ success: false, message: "Rejection reason is required" });
    }

    const updated = await Prescription.findByIdAndUpdate(
      req.params.id,
      {
        status: "rejected",
        rejectedAt: new Date(),
        approvedAt: null,
        pharmacistNotes: reason,
        aiRejectionReason: reason,
        reviewedBy: req.user._id,
      },
      { new: true },
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Prescription not found" });
    }

    return res.json({ success: true, prescription: updated });
  } catch (error) {
    console.error("rejectPrescription error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to reject prescription" });
  }
};

// ─── Prescription Image ───────────────────────────────────────────────────────

export const getPrescriptionImage = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id).select(
      "images",
    );

    if (!prescription) {
      return res
        .status(404)
        .json({ success: false, message: "Prescription not found" });
    }

    return res.json({
      success: true,
      imageUrl: prescription.images?.[0] || null,
      images: prescription.images || [],
    });
  } catch (error) {
    console.error("getPrescriptionImage error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch prescription image" });
  }
};

// ─── Orders Management ───────────────────────────────────────────────────────

const mapOrderForAdmin = (order) => {
  const data = order?.toObject ? order.toObject() : order;
  const canonicalStatus = toCanonicalStatus(data?.status);
  const items = Array.isArray(data?.items) ? data.items : [];
  const computedAmount = items.reduce(
    (sum, item) =>
      sum + parseNumber(item?.price, 0) * parseNumber(item?.quantity, 0),
    0,
  );
  const statusHistory = (
    Array.isArray(data?.statusHistory) ? data.statusHistory : []
  ).map((evt) => ({
    status: toCanonicalStatus(evt?.status),
    note: evt?.note || "",
    changedAt: evt?.changedAt || null,
  }));

  return {
    _id: data?._id,
    status: canonicalStatus,
    rawStatus: data?.status,
    user: data?.user
      ? {
          _id: data.user._id,
          name: data.user.name,
          email: data.user.email,
          phone: data.user.phone,
        }
      : null,
    items: items.map((item) => ({
      _id: item?._id,
      quantity: parseNumber(item?.quantity, 0),
      price: parseNumber(item?.price, 0),
      subtotal: parseNumber(item?.price, 0) * parseNumber(item?.quantity, 0),
      product: item?.product
        ? {
            _id: item.product._id,
            name: item.product.name,
            requiresRx: Boolean(
              item.product.isRx || item.product.prescriptionRequired,
            ),
          }
        : null,
    })),
    itemCount: items.reduce(
      (sum, item) => sum + parseNumber(item?.quantity, 0),
      0,
    ),
    address: data?.address || "",
    payment: {
      ...(data?.payment || {}),
      amount:
        parseNumber(data?.payment?.amount, NaN) ||
        (parseNumber(data?.payment?.amount, NaN) === 0 ? 0 : computedAmount),
    },
    prescriptionId: data?.prescriptionId || null,
    statusHistory,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
  };
};

export const getAdminOrders = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const search = String(req.query.search || "").trim();
    const userFilter = {};

    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      userFilter.$or = [{ name: re }, { email: re }];
    }

    let userIds = null;
    if (search) {
      const users = await User.find(userFilter).select("_id");
      userIds = users.map((u) => u._id);
    }

    const status = String(req.query.status || "").trim();
    const canonicalStatus =
      status && status !== "all" ? toCanonicalStatus(status) : null;

    const filter = {};
    if (canonicalStatus) {
      const dbStatus =
        CANONICAL_TO_DB_STATUS[canonicalStatus] || canonicalStatus;
      filter.status = { $in: [dbStatus, canonicalStatus] };
    }

    if (search) {
      const searchConditions = [];
      if (userIds?.length) {
        searchConditions.push({ user: { $in: userIds } });
      }

      if (search.length >= 6) {
        searchConditions.push({
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: search,
              options: "i",
            },
          },
        });
      }

      if (searchConditions.length) {
        filter.$or = searchConditions;
      } else {
        return res.json({
          success: true,
          orders: [],
          total: 0,
          page,
          pages: 0,
        });
      }
    }

    const [items, total] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .populate("items.product", "name isRx prescriptionRequired")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    const orders = items.map(mapOrderForAdmin);
    return res.json({
      success: true,
      orders,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("getAdminOrders error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load orders" });
  }
};

export const getAdminOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "name isRx prescriptionRequired")
      .populate("prescriptionId", "_id status createdAt");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    return res.json({ success: true, order: mapOrderForAdmin(order) });
  } catch (error) {
    console.error("getAdminOrderById error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load order" });
  }
};

export const updateAdminOrderStatus = async (req, res) => {
  try {
    const nextStatus = toCanonicalStatus(req.body.status);
    const note = String(req.body.note || "").trim();

    if (!ORDER_STATUS_FLOW.includes(nextStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "name isRx prescriptionRequired")
      .populate("prescriptionId", "_id status createdAt");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const currentStatus = toCanonicalStatus(order.status);
    const allowed = allowedNextStatuses(currentStatus);
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status can only move forward from ${currentStatus}`,
      });
    }

    order.status = CANONICAL_TO_DB_STATUS[nextStatus] || nextStatus;
    order.statusHistory = Array.isArray(order.statusHistory)
      ? order.statusHistory
      : [];
    order.statusHistory.push({
      status: nextStatus,
      note,
      changedAt: new Date(),
    });

    if (nextStatus === "out_for_delivery") {
      ensureTrackingInitialized(order);
      if (note) {
        appendTrackingEvent(order, "dispatch_note", note);
      }
      appendTrackingEvent(order, "out_for_delivery", "Order is on the way");
    }

    if (nextStatus === "delivered" && order.tracking) {
      ensureTrackingInitialized(order);
      if (order.tracking.destinationLocation) {
        order.tracking.currentLocation = {
          lat: order.tracking.destinationLocation.lat,
          lng: order.tracking.destinationLocation.lng,
          updatedAt: new Date(),
        };
      }
      order.tracking.estimatedDeliveryTime = new Date();
      appendTrackingEvent(order, "delivered", "Order delivered successfully");
    }

    await order.save();

    return res.json({ success: true, order: mapOrderForAdmin(order) });
  } catch (error) {
    console.error("updateAdminOrderStatus error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update order status" });
  }
};

export const getAdminOrderStats = async (req, res) => {
  try {
    const statusRows = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = ORDER_STATUS_FLOW.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {});

    for (const row of statusRows) {
      const k = toCanonicalStatus(row?._id);
      counts[k] = (counts[k] || 0) + parseNumber(row?.count, 0);
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);

    const revenueRows = await Order.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $project: {
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          amount: {
            $cond: [
              { $ifNull: ["$payment.amount", false] },
              "$payment.amount",
              {
                $sum: {
                  $map: {
                    input: { $ifNull: ["$items", []] },
                    as: "it",
                    in: {
                      $multiply: [
                        { $ifNull: ["$$it.price", 0] },
                        { $ifNull: ["$$it.quantity", 0] },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$day",
          revenue: { $sum: "$amount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueMap = new Map(revenueRows.map((r) => [r._id, r]));
    const revenueByDay = [];
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      const row = revenueMap.get(key);
      revenueByDay.push({
        date: key,
        revenue: parseNumber(row?.revenue, 0),
        orders: parseNumber(row?.orders, 0),
      });
    }

    return res.json({ success: true, counts, revenueByDay });
  } catch (error) {
    console.error("getAdminOrderStats error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load order stats" });
  }
};

// ─── Products Management ─────────────────────────────────────────────────────

const normalizeProductPayload = (body, { isPatch = false } = {}) => {
  const payload = {};
  const assign = (key, value) => {
    if (value !== undefined) payload[key] = value;
  };

  assign("name", body.name?.trim());
  assign("composition", body.composition?.trim());
  assign("description", body.description?.trim());
  assign("strength", body.strength?.trim());
  assign("manufacturer", body.manufacturer?.trim());
  assign("packSize", body.packSize?.trim());
  assign("dosageForm", body.dosageForm?.trim());

  if (body.price !== undefined) assign("price", parseNumber(body.price, 0));
  if (body.mrp !== undefined) assign("mrp", parseNumber(body.mrp, 0));
  if (body.stock !== undefined)
    assign("stock", Math.max(0, Math.floor(parseNumber(body.stock, 0))));
  if (body.isActive !== undefined)
    assign("isActive", parseBoolean(body.isActive));

  if (
    body.requiresRx !== undefined ||
    body.prescriptionRequired !== undefined ||
    body.isRx !== undefined
  ) {
    const requiresRx = parseBoolean(
      body.requiresRx || body.prescriptionRequired || body.isRx,
    );
    assign("prescriptionRequired", requiresRx);
    assign("isRx", requiresRx);
  }

  if (!isPatch) {
    if (!payload.name) throw new Error("Product name is required");
    if (!payload.composition) throw new Error("Composition is required");
    if (!(payload.price > 0)) throw new Error("Price must be greater than 0");
  }

  if (
    payload.mrp !== undefined &&
    payload.price !== undefined &&
    payload.price > payload.mrp
  ) {
    throw new Error("Price must be less than or equal to MRP");
  }

  return payload;
};

const safeUnlinkUpload = async (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return;
  if (!imagePath.startsWith("/uploads/products/")) return;
  const filename = path.basename(imagePath);
  const fullPath = path.resolve(process.cwd(), "uploads", "products", filename);
  try {
    await fs.promises.unlink(fullPath);
  } catch {
    // Ignore cleanup failure to avoid blocking updates.
  }
};

export const getAdminProducts = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const includeInactive = parseBoolean(req.query.includeInactive);
    const filter = includeInactive ? {} : { isActive: { $ne: false } };
    if (req.query.category) filter.category = req.query.category;

    if (req.query.search) {
      const safe = String(req.query.search).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      const re = new RegExp(safe, "i");
      filter.$or = [{ name: re }, { composition: re }, { manufacturer: re }];
    }

    if (req.query.inStock !== undefined) {
      const inStock = parseBoolean(req.query.inStock);
      filter.stock = inStock ? { $gt: 0 } : { $lte: 0 };
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      products: items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("getAdminProducts error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load products" });
  }
};

export const createAdminProduct = async (req, res) => {
  try {
    const payload = normalizeProductPayload(req.body);

    if (!req.body.category) {
      return res
        .status(400)
        .json({ success: false, message: "Category is required" });
    }

    const category = await Category.findById(req.body.category).select("_id");
    if (!category) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category" });
    }

    payload.category = category._id;

    if (req.file?.filename) {
      payload.image = `/uploads/products/${req.file.filename}`;
      payload.images = [payload.image];
    }

    const product = await Product.create(payload);
    const populated = await Product.findById(product._id).populate(
      "category",
      "name",
    );

    return res.status(201).json({ success: true, product: populated });
  } catch (error) {
    console.error("createAdminProduct error", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create product",
    });
  }
};

export const updateAdminProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const payload = normalizeProductPayload(req.body, { isPatch: true });

    if (req.body.category) {
      const category = await Category.findById(req.body.category).select("_id");
      if (!category) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid category" });
      }
      payload.category = category._id;
    }

    if (req.file?.filename) {
      const newImage = `/uploads/products/${req.file.filename}`;
      payload.image = newImage;
      payload.images = [newImage];
      await safeUnlinkUpload(product.image);
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
    }).populate("category", "name");

    return res.json({ success: true, product: updated });
  } catch (error) {
    console.error("updateAdminProduct error", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update product",
    });
  }
};

export const deleteAdminProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("deleteAdminProduct error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove product" });
  }
};

export const updateAdminProductStock = async (req, res) => {
  try {
    const stock = Math.max(0, Math.floor(parseNumber(req.body.stock, NaN)));
    if (!Number.isFinite(stock)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid stock is required" });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true },
    ).populate("category", "name");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({ success: true, product });
  } catch (error) {
    console.error("updateAdminProductStock error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update stock" });
  }
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export const getAnalyticsRevenue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyStart = new Date(today);
    dailyStart.setDate(dailyStart.getDate() - 29);

    const weeklyStart = new Date(today);
    weeklyStart.setDate(weeklyStart.getDate() - 7 * 11);

    const monthlyStart = new Date(
      today.getFullYear(),
      today.getMonth() - 11,
      1,
    );

    const [dailyRows, weeklyRows, monthlyRows] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: dailyStart },
            status: { $in: completedOrderStatuses },
          },
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            amount: {
              $ifNull: [
                "$payment.amount",
                {
                  $sum: {
                    $map: {
                      input: { $ifNull: ["$items", []] },
                      as: "it",
                      in: {
                        $multiply: [
                          { $ifNull: ["$$it.price", 0] },
                          { $ifNull: ["$$it.quantity", 0] },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$date",
            revenue: { $sum: "$amount" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: weeklyStart },
            status: { $in: completedOrderStatuses },
          },
        },
        {
          $project: {
            y: { $isoWeekYear: "$createdAt" },
            w: { $isoWeek: "$createdAt" },
            amount: {
              $ifNull: [
                "$payment.amount",
                {
                  $sum: {
                    $map: {
                      input: { $ifNull: ["$items", []] },
                      as: "it",
                      in: {
                        $multiply: [
                          { $ifNull: ["$$it.price", 0] },
                          { $ifNull: ["$$it.quantity", 0] },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: { y: "$y", w: "$w" },
            revenue: { $sum: "$amount" },
            orders: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: monthlyStart },
            status: { $in: completedOrderStatuses },
          },
        },
        {
          $project: {
            month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            amount: {
              $ifNull: [
                "$payment.amount",
                {
                  $sum: {
                    $map: {
                      input: { $ifNull: ["$items", []] },
                      as: "it",
                      in: {
                        $multiply: [
                          { $ifNull: ["$$it.price", 0] },
                          { $ifNull: ["$$it.quantity", 0] },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$month",
            revenue: { $sum: "$amount" },
            orders: { $sum: 1 },
          },
        },
      ]),
    ]);

    const dailyMap = new Map(dailyRows.map((r) => [r._id, r]));
    const daily = [];
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(dailyStart);
      d.setDate(dailyStart.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const row = dailyMap.get(key);
      daily.push({
        date: key,
        revenue: parseNumber(row?.revenue, 0),
        orders: parseNumber(row?.orders, 0),
      });
    }

    const weeklyMap = new Map(
      weeklyRows.map((r) => [
        `${r._id.y}-W${String(r._id.w).padStart(2, "0")}`,
        r,
      ]),
    );
    const weekly = [];
    for (let i = 0; i < 12; i += 1) {
      const d = new Date(weeklyStart);
      d.setDate(weeklyStart.getDate() + i * 7);
      const y = Number(
        d.toLocaleDateString("en-CA", {
          year: "numeric",
          timeZone: "UTC",
        }),
      );
      const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const days = Math.floor((d - jan1) / 86400000);
      const w = Math.floor((days + jan1.getUTCDay() + 6) / 7) + 1;
      const key = `${y}-W${String(w).padStart(2, "0")}`;
      const row = weeklyMap.get(key);
      weekly.push({
        week: key,
        revenue: parseNumber(row?.revenue, 0),
        orders: parseNumber(row?.orders, 0),
      });
    }

    const monthlyMap = new Map(monthlyRows.map((r) => [r._id, r]));
    const monthly = [];
    for (let i = 0; i < 12; i += 1) {
      const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = monthlyMap.get(key);
      monthly.push({
        month: key,
        revenue: parseNumber(row?.revenue, 0),
        orders: parseNumber(row?.orders, 0),
      });
    }

    return res.json({ daily, weekly, monthly });
  } catch (error) {
    console.error("getAnalyticsRevenue error", error);
    return res
      .status(500)
      .json({ message: "Failed to load revenue analytics" });
  }
};

export const getAnalyticsTopMedicines = async (req, res) => {
  try {
    const rows = await Order.aggregate([
      {
        $match: {
          status: { $in: completedOrderStatuses },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalOrdered: { $sum: { $ifNull: ["$items.quantity", 0] } },
          totalRevenue: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.quantity", 0] },
                { $ifNull: ["$items.price", 0] },
              ],
            },
          },
        },
      },
      { $sort: { totalOrdered: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "product.category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          name: "$product.name",
          totalOrdered: 1,
          totalRevenue: 1,
          category: "$category.name",
        },
      },
    ]);

    return res.json({ medicines: rows });
  } catch (error) {
    console.error("getAnalyticsTopMedicines error", error);
    return res.status(500).json({ message: "Failed to load top medicines" });
  }
};

export const getAnalyticsPrescriptions = async (req, res) => {
  try {
    const [statusRows, aiRates, uploadsRows] = await Promise.all([
      Prescription.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Prescription.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            aiPassed: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["awaiting_pharmacist", "approved"]] },
                  1,
                  0,
                ],
              },
            },
            pharmacistApproved: {
              $sum: {
                $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
              },
            },
            avgConfidenceScore: { $avg: "$aiConfidenceScore" },
          },
        },
      ]),
      Prescription.aggregate([
        {
          $match: {
            createdAt: {
              $gte: (() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() - 29);
                return d;
              })(),
            },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byStatus = {
      pending: 0,
      awaiting: 0,
      approved: 0,
      rejected: 0,
      ai_rejected: 0,
      expired: 0,
    };

    for (const row of statusRows) {
      const k = String(row._id || "");
      if (k === "awaiting_pharmacist")
        byStatus.awaiting = parseNumber(row.count, 0);
      else if (Object.prototype.hasOwnProperty.call(byStatus, k))
        byStatus[k] = parseNumber(row.count, 0);
    }

    const rates = aiRates?.[0] || {};
    const total = parseNumber(rates.total, 0);
    const aiApprovalRate = total
      ? (parseNumber(rates.aiPassed, 0) / total) * 100
      : 0;
    const pharmacistApprovalRate = total
      ? (parseNumber(rates.pharmacistApproved, 0) / total) * 100
      : 0;
    const avgConfidenceScore = parseNumber(rates.avgConfidenceScore, 0);

    const uploadMap = new Map(uploadsRows.map((r) => [r._id, r.count]));
    const dailyUploads = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyUploads.push({
        date: key,
        count: parseNumber(uploadMap.get(key), 0),
      });
    }

    return res.json({
      byStatus,
      aiApprovalRate,
      pharmacistApprovalRate,
      avgConfidenceScore,
      dailyUploads,
    });
  } catch (error) {
    console.error("getAnalyticsPrescriptions error", error);
    return res
      .status(500)
      .json({ message: "Failed to load prescription analytics" });
  }
};

export const getAnalyticsUsers = async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);

    const [dailyRows, roleRows, usersWithOrders] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Order.distinct("user"),
    ]);

    const dailyMap = new Map(dailyRows.map((r) => [r._id, r.count]));
    const dailyRegistrations = [];
    for (let i = 0; i < 30; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyRegistrations.push({
        date: key,
        count: parseNumber(dailyMap.get(key), 0),
      });
    }

    const byRole = {
      user: 0,
      admin: 0,
      pharmacist: 0,
    };

    for (const row of roleRows) {
      const role = String(row._id || "");
      const count = parseNumber(row.count, 0);
      if (role === "customer" || role === "user") byRole.user += count;
      else if (role === "admin") byRole.admin += count;
      else if (role === "pharmacist") byRole.pharmacist += count;
    }

    const totalUsers = await User.countDocuments({});
    const activeUsers = usersWithOrders.length;
    const inactiveUsers = Math.max(0, totalUsers - activeUsers);

    return res.json({
      dailyRegistrations,
      byRole,
      activeUsers,
      inactiveUsers,
    });
  } catch (error) {
    console.error("getAnalyticsUsers error", error);
    return res.status(500).json({ message: "Failed to load user analytics" });
  }
};

export const getAnalyticsSummary = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      allCompletedOrders,
      ordersThisMonth,
      ordersPrevMonth,
      totalUsers,
      newUsersThisMonth,
      newUsersPrevMonth,
      totalOrders,
      allPrescriptions,
      approvedPrescriptions,
      monthlyRevenue,
      revenueLastMonth,
      dailyRevenueRows,
      deliveredOrdersForTime,
      pendingOrders,
      pendingPrescriptions,
    ] = await Promise.all([
      Order.find({ status: { $in: completedOrderStatuses } }).select(
        "payment items",
      ),
      Order.find({
        createdAt: { $gte: monthStart, $lt: nextMonthStart },
      }).select("_id"),
      Order.find({
        createdAt: { $gte: prevMonthStart, $lt: monthStart },
      }).select("_id"),
      User.countDocuments({}),
      User.countDocuments({
        createdAt: { $gte: monthStart, $lt: nextMonthStart },
      }),
      User.countDocuments({
        createdAt: { $gte: prevMonthStart, $lt: monthStart },
      }),
      Order.countDocuments({}),
      Prescription.countDocuments({}),
      Prescription.countDocuments({ status: "approved" }),
      Order.find({
        status: { $in: completedOrderStatuses },
        createdAt: { $gte: monthStart, $lt: nextMonthStart },
      }).select("payment items"),
      Order.find({
        status: { $in: completedOrderStatuses },
        createdAt: { $gte: prevMonthStart, $lt: monthStart },
      }).select("payment items"),
      Order.aggregate([
        {
          $match: {
            status: { $in: completedOrderStatuses },
            createdAt: {
              $gte: (() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() - 6);
                return d;
              })(),
            },
          },
        },
        {
          $project: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            amount: {
              $ifNull: [
                "$payment.amount",
                {
                  $sum: {
                    $map: {
                      input: { $ifNull: ["$items", []] },
                      as: "it",
                      in: {
                        $multiply: [
                          { $ifNull: ["$$it.price", 0] },
                          { $ifNull: ["$$it.quantity", 0] },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
        { $group: { _id: "$date", revenue: { $sum: "$amount" } } },
      ]),
      Order.find({ status: { $in: ["Delivered", "delivered"] } }).select(
        "statusHistory createdAt updatedAt",
      ),
      Order.countDocuments({ status: { $in: ["Placed", "pending"] } }),
      Prescription.countDocuments({
        status: { $in: ["pending", "awaiting_pharmacist"] },
      }),
    ]);

    const totalRevenue = allCompletedOrders.reduce(
      (sum, o) => sum + getOrderAmount(o),
      0,
    );
    const revenueThisMonth = monthlyRevenue.reduce(
      (sum, o) => sum + getOrderAmount(o),
      0,
    );
    const revenuePrevMonth = revenueLastMonth.reduce(
      (sum, o) => sum + getOrderAmount(o),
      0,
    );

    const growth = (current, prev) => {
      if (!prev) return current ? 100 : 0;
      return ((current - prev) / prev) * 100;
    };

    const revenueGrowth = growth(revenueThisMonth, revenuePrevMonth);
    const ordersThisMonthCount = ordersThisMonth.length;
    const orderGrowth = growth(ordersThisMonthCount, ordersPrevMonth.length);
    const userGrowth = growth(newUsersThisMonth, newUsersPrevMonth);
    const prescriptionApprovalRate = allPrescriptions
      ? (approvedPrescriptions / allPrescriptions) * 100
      : 0;

    const avgDeliveryTimeHours = (() => {
      let totalHours = 0;
      let count = 0;
      for (const order of deliveredOrdersForTime) {
        const history = Array.isArray(order.statusHistory)
          ? order.statusHistory
          : [];
        const confirmedEvent = history.find(
          (h) => toCanonicalStatus(h.status) === "confirmed",
        );
        const deliveredEvent = history.find(
          (h) => toCanonicalStatus(h.status) === "delivered",
        );
        const startAt = confirmedEvent?.changedAt || order.createdAt;
        const endAt = deliveredEvent?.changedAt || order.updatedAt;
        if (startAt && endAt && endAt >= startAt) {
          totalHours += (new Date(endAt) - new Date(startAt)) / 3600000;
          count += 1;
        }
      }
      return count ? totalHours / count : 0;
    })();

    const start7 = new Date();
    start7.setHours(0, 0, 0, 0);
    start7.setDate(start7.getDate() - 6);
    const revenueMap = new Map(
      dailyRevenueRows.map((r) => [r._id, parseNumber(r.revenue, 0)]),
    );
    const revenueLast7Days = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(start7);
      d.setDate(start7.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      revenueLast7Days.push({
        date: key,
        revenue: parseNumber(revenueMap.get(key), 0),
      });
    }

    return res.json({
      totalRevenue,
      revenueThisMonth,
      revenueGrowth,
      totalOrders,
      ordersThisMonth: ordersThisMonthCount,
      orderGrowth,
      totalUsers,
      newUsersThisMonth,
      userGrowth,
      prescriptionApprovalRate,
      avgDeliveryTime: avgDeliveryTimeHours,
      revenueLast7Days,
      pendingOrders,
      pendingPrescriptions,
    });
  } catch (error) {
    console.error("getAnalyticsSummary error", error);
    return res
      .status(500)
      .json({ message: "Failed to load analytics summary" });
  }
};

// ─── User Management ─────────────────────────────────────────────────────────

export const getAdminUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      const safe = String(req.query.search).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      const re = new RegExp(safe, "i");
      filter.$or = [{ name: re }, { email: re }];
    }
    if (req.query.role && req.query.role !== "all") {
      filter.role = req.query.role;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("name email phone role createdAt suspended"),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const orderStats = await Order.aggregate([
      { $match: { user: { $in: userIds } } },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
          lastOrderAt: { $max: "$createdAt" },
          totalSpent: {
            $sum: {
              $ifNull: [
                "$payment.amount",
                {
                  $sum: {
                    $map: {
                      input: { $ifNull: ["$items", []] },
                      as: "it",
                      in: {
                        $multiply: [
                          { $ifNull: ["$$it.price", 0] },
                          { $ifNull: ["$$it.quantity", 0] },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    ]);
    const statsMap = new Map(orderStats.map((s) => [String(s._id), s]));

    const items = users.map((user) => {
      const stat = statsMap.get(String(user._id));
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        suspended: Boolean(user.suspended),
        createdAt: user.createdAt,
        orderCount: parseNumber(stat?.orderCount, 0),
        lastOrderAt: stat?.lastOrderAt || null,
        totalSpent: parseNumber(stat?.totalSpent, 0),
      };
    });

    return res.json({
      success: true,
      users: items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("getAdminUsers error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load users" });
  }
};

export const getAdminUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name email phone role createdAt suspended rememberMeEnabled lastLoginEmail",
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const [orders, prescriptions, spendRows] = await Promise.all([
      Order.find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("status createdAt payment items"),
      Prescription.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("status createdAt aiConfidenceScore"),
      Order.find({ user: user._id }).select("payment items"),
    ]);

    const totalSpent = spendRows.reduce(
      (sum, order) => sum + getOrderAmount(order),
      0,
    );

    return res.json({
      success: true,
      user,
      orders,
      prescriptions,
      totalSpent,
    });
  } catch (error) {
    console.error("getAdminUserById error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load user profile" });
  }
};

export const updateAdminUserRole = async (req, res) => {
  try {
    const targetRole = String(req.body.role || "").trim();
    if (
      !targetRole ||
      !["user", "customer", "pharmacist", "admin"].includes(targetRole)
    ) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    if (String(req.user._id) === String(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot change your own role" });
    }

    const normalizedRole = targetRole === "user" ? "customer" : targetRole;

    if (normalizedRole === "admin" && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Only admin can promote to admin" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: normalizedRole },
      { new: true },
    ).select("name email phone role createdAt suspended");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error("updateAdminUserRole error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update user role" });
  }
};

export const toggleAdminUserSuspend = async (req, res) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot suspend your own account",
      });
    }

    const suspended = Boolean(req.body.suspended);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { suspended },
      { new: true },
    ).select("name email phone role createdAt suspended");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error("toggleAdminUserSuspend error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update user status" });
  }
};
