import Product from "../models/Product.js";
import User from "../models/User.js";
import VaultItem from "../models/VaultItem.js";

const CRITICAL_PRIORITY = {
  high: 3,
  medium: 2,
  low: 1,
};

const DAY_MS = 86400000;

const computeExpiryMeta = (expiryDate, now = new Date()) => {
  const daysUntilExpiry = Math.ceil(
    (new Date(expiryDate).getTime() - now.getTime()) / DAY_MS,
  );

  if (daysUntilExpiry < 0) {
    return { daysUntilExpiry, expiryStatus: "expired" };
  }
  if (daysUntilExpiry <= 7) {
    return { daysUntilExpiry, expiryStatus: "critical" };
  }
  if (daysUntilExpiry <= 14) {
    return { daysUntilExpiry, expiryStatus: "warning" };
  }
  return { daysUntilExpiry, expiryStatus: "ok" };
};

const withComputedMeta = (item, now = new Date()) => {
  const plain = typeof item.toObject === "function" ? item.toObject() : item;
  return {
    ...plain,
    ...computeExpiryMeta(plain.expiryDate, now),
  };
};

const asObjectId = (value) => String(value || "").trim();

export const getVault = async (req, res) => {
  try {
    const items = await VaultItem.find({ userId: req.user._id }).lean();
    const now = new Date();

    const mapped = items
      .map((item) => ({ ...item, ...computeExpiryMeta(item.expiryDate, now) }))
      .sort((a, b) => {
        const p =
          (CRITICAL_PRIORITY[b.criticalLevel] || 0) -
          (CRITICAL_PRIORITY[a.criticalLevel] || 0);
        if (p !== 0) return p;
        return (
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        );
      });

    return res.json({ success: true, items: mapped });
  } catch (error) {
    console.error("getVault error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch vault" });
  }
};

export const addVaultItem = async (req, res) => {
  try {
    const {
      productName,
      quantity,
      unit,
      expiryDate,
      criticalLevel,
      notes,
      productId,
    } = req.body || {};

    const normalizedName = String(productName || "").trim();
    if (!normalizedName) {
      return res
        .status(400)
        .json({ success: false, message: "productName is required" });
    }

    const duplicate = await VaultItem.findOne({
      userId: req.user._id,
      productName: {
        $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (duplicate) {
      return res
        .status(409)
        .json({ success: false, message: "Item already in vault" });
    }

    const created = await VaultItem.create({
      userId: req.user._id,
      productId: productId || null,
      productName: normalizedName,
      quantity: Number(quantity ?? 0),
      unit: unit || "units",
      expiryDate,
      criticalLevel: criticalLevel || "medium",
      notes: notes || "",
    });

    return res
      .status(201)
      .json({ success: true, item: withComputedMeta(created) });
  } catch (error) {
    console.error("addVaultItem error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to add vault item" });
  }
};

export const updateVaultItem = async (req, res) => {
  try {
    const item = await VaultItem.findById(req.params.itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Vault item not found" });
    }

    if (String(item.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const allowedFields = [
      "quantity",
      "unit",
      "expiryDate",
      "criticalLevel",
      "notes",
    ];
    for (const field of allowedFields) {
      if (field in req.body) {
        item[field] = req.body[field];
      }
    }

    await item.save();
    return res.json({ success: true, item: withComputedMeta(item) });
  } catch (error) {
    console.error("updateVaultItem error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update vault item" });
  }
};

export const deleteVaultItem = async (req, res) => {
  try {
    const item = await VaultItem.findById(req.params.itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Vault item not found" });
    }

    if (String(item.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    await item.deleteOne();
    return res.json({ success: true, message: "Removed from vault" });
  } catch (error) {
    console.error("deleteVaultItem error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove vault item" });
  }
};

export const getReadiness = async (req, res) => {
  try {
    const items = await VaultItem.find({ userId: req.user._id }).lean();
    const now = new Date();

    let expiredItems = 0;
    let expiringSoon = 0;
    let outOfStock = 0;

    for (const item of items) {
      const { daysUntilExpiry } = computeExpiryMeta(item.expiryDate, now);
      if (daysUntilExpiry < 0) expiredItems += 1;
      if (daysUntilExpiry <= 14 && daysUntilExpiry > 0) expiringSoon += 1;
      if (Number(item.quantity || 0) === 0) outOfStock += 1;
    }

    let score = 100;
    score -= expiredItems * 20;
    score -= expiringSoon * 10;
    score -= outOfStock * 15;
    score = Math.max(0, Math.floor(score));

    let status = "green";
    if (score < 40) status = "red";
    else if (score < 75) status = "yellow";

    return res.json({
      success: true,
      score,
      status,
      total: items.length,
      expiredItems,
      expiringSoon,
      outOfStock,
    });
  } catch (error) {
    console.error("getReadiness error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to compute readiness" });
  }
};

export const reorderVaultItem = async (req, res) => {
  try {
    const item = await VaultItem.findById(req.params.itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Vault item not found" });
    }

    if (String(item.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let product = null;
    if (item.productId) {
      product = await Product.findById(item.productId).select(
        "_id name price mrp image images isRx prescriptionRequired stock composition strength manufacturer",
      );
    }

    if (!product) {
      const escaped = String(item.productName || "")
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      product = await Product.findOne({
        name: { $regex: escaped, $options: "i" },
      }).select(
        "_id name price mrp image images isRx prescriptionRequired stock composition strength manufacturer",
      );
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found in catalog",
        productName: item.productName,
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.cart = Array.isArray(user.cart) ? user.cart : [];
    const existing = user.cart.find(
      (entry) => String(entry.product) === String(product._id),
    );
    if (existing) {
      existing.quantity = Number(existing.quantity || 0) + 1;
    } else {
      user.cart.push({
        product: product._id,
        quantity: 1,
        addedAt: new Date(),
      });
    }
    await user.save();

    const cartItem = {
      id: asObjectId(product._id),
      productId: asObjectId(product._id),
      name: product.name,
      price: Number(product.price || 0),
      mrp: Number(product.mrp || product.price || 0),
      image: product.image || product.images?.[0] || "",
      isRx: Boolean(product.isRx || product.prescriptionRequired),
      requiresRx: Boolean(product.isRx || product.prescriptionRequired),
      composition: product.composition || "",
      strength: product.strength || "",
      manufacturer: product.manufacturer || "",
      quantity: 1,
    };

    return res.json({ success: true, message: "Added to cart", cartItem });
  } catch (error) {
    console.error("reorderVaultItem error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to reorder vault item" });
  }
};
