import Subscription from "../models/Subscription.js";
import Product from "../models/Product.js";
import Prescription from "../models/Prescription.js";
import { createAutoRefillOrder } from "./orderController.js";
import { emitPrescriptionUpdate } from "../services/prescriptionEvents.js";

const hasApprovedPrescription = async (userId) => {
  const rx = await Prescription.findOne({
    userId,
    status: "approved",
    isExpired: false,
  }).sort({ approvedAt: -1, createdAt: -1 });

  if (!rx) return false;
  if (rx.expiryDate && new Date(rx.expiryDate) < new Date()) return false;
  return true;
};

const normalizeReminderDays = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 2;
  if (parsed < 1) return 1;
  if (parsed > 14) return 14;
  return Math.floor(parsed);
};

export const createSubscription = async (req, res) => {
  try {
    const {
      productId,
      quantity = 1,
      frequency = "monthly",
      deliveryAddress = {},
      reminderDaysBefore = 2,
      notes = "",
    } = req.body;

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "productId is required" });
    }

    const product = await Product.findById(productId);
    if (!product || product.isActive === false) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const isRx = Boolean(
      product.requiresRx || product.isRx || product.prescriptionRequired,
    );

    if (isRx) {
      const approved = await hasApprovedPrescription(req.user._id);
      if (!approved) {
        return res.status(403).json({
          success: false,
          message:
            "Approved prescription required before subscribing to this medicine",
        });
      }
    }

    const duplicate = await Subscription.findOne({
      userId: req.user._id,
      "product.productId": product._id,
      status: { $in: ["active", "paused"] },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Subscription already exists for this medicine",
      });
    }

    const subscription = new Subscription({
      userId: req.user._id,
      product: {
        productId: product._id,
        name: product.name,
        price: Number(product.price || 0),
        quantity: Math.max(1, Number(quantity || 1)),
        isRx,
      },
      frequency,
      status: "active",
      deliveryAddress: {
        street: deliveryAddress.street || "",
        city: deliveryAddress.city || "",
        state: deliveryAddress.state || "",
        pincode: deliveryAddress.pincode || "",
      },
      reminderDaysBefore: normalizeReminderDays(reminderDaysBefore),
      notes,
    });

    subscription.nextRefillDate = subscription.calculateNextRefillDate();
    await subscription.save();

    return res.status(201).json({ success: true, subscription });
  } catch (error) {
    console.error("createSubscription error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create subscription" });
  }
};

export const getUserSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.user._id })
      .populate("product.productId", "name image images composition strength")
      .sort({ nextRefillDate: 1 });

    return res.json({ success: true, subscriptions });
  } catch (error) {
    console.error("getUserSubscriptions error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load subscriptions" });
  }
};

export const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .populate("product.productId", "name image images composition strength")
      .populate({
        path: "lastOrderId",
        populate: { path: "items.product", select: "name image images" },
      });

    if (!subscription) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    return res.json({ success: true, subscription });
  } catch (error) {
    console.error("getSubscriptionById error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load subscription" });
  }
};

export const updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!subscription) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled subscriptions cannot be updated",
      });
    }

    const { frequency, quantity, deliveryAddress, reminderDaysBefore, notes } =
      req.body;

    let frequencyChanged = false;

    if (frequency && frequency !== subscription.frequency) {
      subscription.frequency = frequency;
      frequencyChanged = true;
    }

    if (quantity !== undefined) {
      subscription.product.quantity = Math.max(1, Number(quantity || 1));
    }

    if (deliveryAddress) {
      subscription.deliveryAddress = {
        street:
          deliveryAddress.street || subscription.deliveryAddress?.street || "",
        city: deliveryAddress.city || subscription.deliveryAddress?.city || "",
        state:
          deliveryAddress.state || subscription.deliveryAddress?.state || "",
        pincode:
          deliveryAddress.pincode ||
          subscription.deliveryAddress?.pincode ||
          "",
      };
    }

    if (reminderDaysBefore !== undefined) {
      subscription.reminderDaysBefore =
        normalizeReminderDays(reminderDaysBefore);
    }

    if (notes !== undefined) {
      subscription.notes = String(notes || "");
    }

    if (frequencyChanged) {
      subscription.nextRefillDate = subscription.calculateNextRefillDate();
    }

    await subscription.save();

    return res.json({ success: true, subscription });
  } catch (error) {
    console.error("updateSubscription error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update subscription" });
  }
};

export const pauseSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!subscription) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled subscriptions cannot be paused",
      });
    }

    subscription.status = "paused";
    await subscription.save();

    return res.json({ success: true, subscription });
  } catch (error) {
    console.error("pauseSubscription error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to pause subscription" });
  }
};

export const resumeSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!subscription) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    if (subscription.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled subscriptions cannot be resumed",
      });
    }

    subscription.status = "active";
    subscription.nextRefillDate = subscription.calculateNextRefillDate();
    await subscription.save();

    return res.json({ success: true, subscription });
  } catch (error) {
    console.error("resumeSubscription error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resume subscription" });
  }
};

export const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!subscription) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    subscription.cancelReason = String(req.body.reason || "").trim();
    await subscription.save();

    return res.json({ success: true, subscription });
  } catch (error) {
    console.error("cancelSubscription error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to cancel subscription" });
  }
};

export const processRefill = async (subscriptionInput) => {
  const subscription =
    subscriptionInput instanceof Subscription
      ? subscriptionInput
      : await Subscription.findById(subscriptionInput);

  if (!subscription) {
    return { success: false, message: "Subscription not found" };
  }

  if (subscription.status !== "active") {
    return {
      success: false,
      message: `Subscription is ${subscription.status}`,
    };
  }

  try {
    const productDoc = await Product.findById(subscription.product.productId);
    if (!productDoc || productDoc.isActive === false) {
      subscription.status = "paused";
      await subscription.save();
      return {
        success: false,
        message: "Product unavailable, subscription paused",
      };
    }

    const quantity = Math.max(1, Number(subscription.product.quantity || 1));
    const price = Number(productDoc.price || subscription.product.price || 0);

    const order = await createAutoRefillOrder({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      productId: productDoc._id,
      quantity,
      price,
      deliveryAddress: subscription.deliveryAddress,
    });

    subscription.lastRefillDate = new Date();
    subscription.lastOrderId = order._id;
    subscription.totalRefills = Number(subscription.totalRefills || 0) + 1;
    subscription.nextRefillDate = subscription.calculateNextRefillDate();
    await subscription.save();

    await emitPrescriptionUpdate({
      userId: subscription.userId,
      reason: "refill",
      payload: {
        subscriptionId: subscription._id,
        orderId: order._id,
        totalRefills: subscription.totalRefills,
      },
    });

    return {
      success: true,
      orderId: order._id,
      subscriptionId: subscription._id,
    };
  } catch (error) {
    subscription.status = "paused";
    await subscription.save();
    console.error("processRefill error", {
      subscriptionId: subscription._id,
      error,
    });
    return {
      success: false,
      message: "Refill failed, subscription paused",
      error,
    };
  }
};
