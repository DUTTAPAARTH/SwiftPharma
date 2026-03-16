import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Prescription from "../models/Prescription.js";

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
    return {
      ok: true,
      products,
      prescriptionId: validApprovedPrescription._id,
    };
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

  if (
    ["pending", "ai_reviewing", "awaiting_pharmacist"].includes(
      latestPrescription.status,
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
        status: latestPrescription.status,
        action: "WAIT_FOR_APPROVAL",
      },
    };
  }

  if (["ai_rejected", "rejected"].includes(latestPrescription.status)) {
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
    latestPrescription.isExpired ||
    latestPrescription.status === "expired" ||
    (latestPrescription.expiryDate &&
      latestPrescription.expiryDate < new Date()) ||
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
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json(updated);
  } catch (error) {
    console.error("updateOrderStatus error", error);
    return res.status(500).json({ message: "Failed to update order" });
  }
};
