import express from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/authMiddleware.js";
import HealthProfile from "../models/HealthProfile.js";
import VaultItem from "../models/VaultItem.js";
import Prescription from "../models/Prescription.js";

const router = express.Router();

const normalizeList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
};

const sanitizeBody = (body = {}) => {
  const payload = {};
  const passThrough = [
    "age",
    "biologicalSex",
    "bloodGroup",
    "heightCm",
    "weightKg",
    "lifestyleNotes",
    "preferredLanguage",
    "preferredTone",
  ];

  for (const key of passThrough) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      payload[key] = body[key];
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "allergies")) {
    payload.allergies = normalizeList(body.allergies);
  }
  if (Object.prototype.hasOwnProperty.call(body, "chronicConditions")) {
    payload.chronicConditions = normalizeList(body.chronicConditions);
  }
  if (Object.prototype.hasOwnProperty.call(body, "regularMedicines")) {
    payload.regularMedicines = normalizeList(body.regularMedicines);
  }
  if (Object.prototype.hasOwnProperty.call(body, "healthGoals")) {
    payload.healthGoals = normalizeList(body.healthGoals);
  }

  return payload;
};

router.use(authenticate);

router.get("/", async (req, res) => {
  try {
    const userId = req.user?._id;
    const profile = await HealthProfile.findOne({ userId }).lean();

    return res.json({
      success: true,
      profile: profile || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load health profile",
      error: error.message,
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.user?._id;
    const existing = await HealthProfile.findOne({ userId }).select("_id").lean();

    if (existing?._id) {
      return res.status(409).json({
        success: false,
        message: "Health profile already exists. Use PATCH to update.",
      });
    }

    const payload = sanitizeBody(req.body || {});
    const profile = await HealthProfile.create({ userId, ...payload });

    return res.status(201).json({
      success: true,
      profile,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to create health profile",
      error: error.message,
    });
  }
});

router.patch("/", async (req, res) => {
  try {
    const userId = req.user?._id;
    const payload = sanitizeBody(req.body || {});

    const profile = await HealthProfile.findOneAndUpdate(
      { userId },
      { $set: payload },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );

    return res.json({
      success: true,
      profile,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Failed to update health profile",
      error: error.message,
    });
  }
});

router.post("/sync-vault", async (req, res) => {
  try {
    const userId = req.user?._id;

    const [vaultItems, prescriptions] = await Promise.all([
      VaultItem.find({ userId }).select("productName").lean(),
      Prescription.find({
        userId,
        status: { $in: ["approved", "partially_fulfilled", "fully_fulfilled"] },
        $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
      })
        .select("medicines aiExtractedMedicines")
        .populate({ path: "medicines.productId", select: "name" })
        .lean(),
    ]);

    const inferred = new Set();
    for (const item of vaultItems) {
      if (item?.productName) {
        inferred.add(String(item.productName).trim());
      }
    }

    for (const rx of prescriptions) {
      for (const med of rx?.medicines || []) {
        const linkedName = String(med?.productId?.name || "").trim();
        if (linkedName) inferred.add(linkedName);
      }
      for (const med of rx?.aiExtractedMedicines || []) {
        if (med?.name) inferred.add(String(med.name).trim());
      }
    }

    const inferredList = [...inferred].filter(Boolean);

    const profile = await HealthProfile.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { userId },
        $set: { lastSyncedAt: new Date() },
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );

    const byText = new Map(
      (profile.memoryMentions || []).map((entry) => [
        String(entry.text || "").toLowerCase(),
        entry,
      ]),
    );

    let inserted = 0;
    for (const mentionText of inferredList) {
      const key = mentionText.toLowerCase();
      const existing = byText.get(key);
      if (existing) {
        existing.lastSeenAt = new Date();
        existing.seenCount = Number(existing.seenCount || 1) + 1;
        continue;
      }
      profile.memoryMentions.push({
        text: mentionText,
        source: "vault",
        confidence: 0.7,
        status: "pending",
      });
      inserted += 1;
    }

    await profile.save();

    return res.json({
      success: true,
      syncedMentions: inferredList.length,
      inserted,
      profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to sync profile with vault and prescriptions",
      error: error.message,
    });
  }
});

router.post("/confirm-mention", async (req, res) => {
  try {
    const userId = req.user?._id;
    
    console.log("[confirm-mention] Request:", { 
      userId, 
      body: req.body,
      hasUser: !!req.user 
    });

    if (!userId) {
      console.error("[confirm-mention] No userId found in request");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const mentionText = String(req.body?.mentionText || "").trim();
    const accepted = Boolean(req.body?.accepted);

    if (!mentionText) {
      return res.status(400).json({
        success: false,
        message: "mentionText is required",
      });
    }

    const profile = await HealthProfile.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );

    const key = mentionText.toLowerCase();
    let mention = (profile.memoryMentions || []).find(
      (item) => String(item.text || "").toLowerCase() === key,
    );

    if (!mention) {
      profile.memoryMentions.push({
        text: mentionText,
        source: "manual",
        status: accepted ? "confirmed" : "rejected",
        confidence: accepted ? 1 : 0.4,
      });
    } else {
      mention.status = accepted ? "confirmed" : "rejected";
      mention.lastSeenAt = new Date();
      mention.seenCount = Number(mention.seenCount || 1) + 1;
    }

    if (accepted) {
      const currentConditions = new Set(
        (profile.chronicConditions || []).map((item) =>
          String(item || "").trim().toLowerCase(),
        ),
      );
      if (!currentConditions.has(key)) {
        profile.chronicConditions = [
          ...(profile.chronicConditions || []),
          mentionText,
        ];
      }
    }

    await profile.save();

    console.log("[confirm-mention] Success:", { userId, mentionText, accepted });

    return res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("[confirm-mention] Error:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?._id,
      body: req.body
    });
    
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Invalid mention payload",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to confirm mention",
      error: error.message,
    });
  }
});

export default router;

