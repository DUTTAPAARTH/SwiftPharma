import AgentLocation from "../models/AgentLocation.js";
import CaregiverLink from "../models/CaregiverLink.js";
import EmergencyCallLog from "../models/EmergencyCallLog.js";
import EmergencyRelay from "../models/EmergencyRelay.js";
import Hospital from "../models/Hospital.js";
import Product from "../models/Product.js";
import RelayHistory from "../models/RelayHistory.js";
import User from "../models/User.js";
import { callAI } from "../services/aiService.js";
import {
  broadcastEmergencyTo,
  emitToUser,
  getIO,
  notifyRelayClaimed,
} from "../socket.js";
import {
  haversineDistanceKm,
  kmToSphereRadians,
} from "../utils/emergencyGeo.js";
import { upsertRelayHistory } from "../utils/relayHistory.js";

const DELIVERY_ROLE = "delivery";
const CUSTOMER_ROLE = "customer";

const TRIAGE_SYSTEM_PROMPT =
  "You are a pharmacy triage assistant for a medical emergency app in India.";

const asObject = (doc) =>
  typeof doc?.toObject === "function" ? doc.toObject() : doc;

const normalizeMedicines = (medicines = []) =>
  (Array.isArray(medicines) ? medicines : [])
    .map((item) => ({
      name: String(item?.name || "").trim(),
      quantity: String(item?.quantity || "1").trim(),
    }))
    .filter((item) => item.name);

const isValidLocation = (location = {}) => {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
};

const requireRole = (req, res, role) => {
  if (String(req.user?.role || "").toLowerCase() !== role) {
    res.status(403).json({ success: false, message: "Forbidden" });
    return false;
  }
  return true;
};

const safeRelayForSocket = (relayLike) => {
  const relay = asObject(relayLike);
  return {
    ...relay,
    claimedBy:
      relay?.claimedBy && typeof relay.claimedBy === "object"
        ? { _id: relay.claimedBy._id, name: relay.claimedBy.name }
        : relay?.claimedBy,
  };
};

const parseJsonFromAI = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("AI response is not valid JSON");
    }
    return JSON.parse(text.slice(start, end + 1));
  }
};

const triageFallback = {
  suggestedMedicines: [],
  callAmbulance: false,
  urgencyLevel: "medium",
  disclaimer: "AI triage unavailable. Please select medicines manually.",
  fallback: true,
};

const findNearbyAgentIds = async ({ lat, lng, radiusKm }) => {
  const rows = await AgentLocation.find({
    location: {
      $geoWithin: {
        $centerSphere: [
          [Number(lng), Number(lat)],
          kmToSphereRadians(radiusKm),
        ],
      },
    },
  }).select("agentId");

  return rows.map((row) => String(row.agentId));
};

export const createRelay = async (req, res) => {
  try {
    if (!requireRole(req, res, CUSTOMER_ROLE)) return;

    const medicines = normalizeMedicines(req.body?.medicines);
    const location = req.body?.location || {};

    if (!medicines.length) {
      return res
        .status(400)
        .json({ success: false, message: "At least one medicine is required" });
    }

    if (!isValidLocation(location)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid location is required" });
    }

    const activeRelay = await EmergencyRelay.findOne({
      userId: req.user._id,
      status: { $in: ["broadcasting", "claimed"] },
    });

    if (activeRelay) {
      return res.status(400).json({
        success: false,
        message: "You already have an active SOS relay",
      });
    }

    const user = await User.findById(req.user._id).select("emergencyContact");

    const emergencyContactName = String(
      req.body?.emergencyContactName || user?.emergencyContact?.name || "",
    ).trim();
    const emergencyContactPhone = String(
      req.body?.emergencyContactPhone || user?.emergencyContact?.phone || "",
    ).trim();

    const radiusKm = Number(req.body?.radiusKm || 5);

    const relay = await EmergencyRelay.create({
      userId: req.user._id,
      medicines,
      location: {
        lat: Number(location.lat),
        lng: Number(location.lng),
      },
      radiusKm,
      emergencyContactName,
      emergencyContactPhone,
      lastEscalatedAt: new Date(),
    });

    const nearbyAgentUserIds = await findNearbyAgentIds({
      lat: relay.location.lat,
      lng: relay.location.lng,
      radiusKm: relay.radiusKm,
    });

    relay.nearbyAgentCount = nearbyAgentUserIds.length;
    relay.notifiedAgentIds = nearbyAgentUserIds;
    await relay.save();

    broadcastEmergencyTo(safeRelayForSocket(relay), nearbyAgentUserIds);

    return res.status(201).json({ success: true, relay });
  } catch (error) {
    console.error("createRelay error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create SOS relay" });
  }
};

export const logAmbulanceCall = async (req, res) => {
  try {
    if (!requireRole(req, res, CUSTOMER_ROLE)) return;

    const [patient, caregiverLink] = await Promise.all([
      User.findById(req.user._id).select("name phone"),
      CaregiverLink.findOne({
        patientId: req.user._id,
        status: "active",
      }).select("caregiverId caregiverName"),
    ]);

    const location = req.body?.location || {};
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    const hasLocation = Number.isFinite(lat) && Number.isFinite(lng);
    const locationLabel = String(
      req.body?.locationLabel || req.body?.address || "",
    ).trim();

    const callLog = await EmergencyCallLog.create({
      userId: req.user._id,
      patientName: String(patient?.name || req.user.name || "").trim(),
      patientPhone: String(patient?.phone || req.user.phone || "").trim(),
      caregiverId: caregiverLink?.caregiverId || null,
      emergencyNumber: "108",
      location: hasLocation ? { lat, lng } : undefined,
      locationLabel,
      metadata: {
        source: "sos_page",
        userAgent: String(req.headers["user-agent"] || "").slice(0, 256),
      },
    });

    if (caregiverLink?.caregiverId) {
      emitToUser(String(caregiverLink.caregiverId), "ambulance_called", {
        log: {
          _id: callLog._id,
          userId: callLog.userId,
          patientName: callLog.patientName,
          patientPhone: callLog.patientPhone,
          caregiverId: callLog.caregiverId,
          emergencyNumber: callLog.emergencyNumber,
          location: callLog.location || null,
          locationLabel: callLog.locationLabel,
          createdAt: callLog.createdAt,
        },
      });
    }

    return res.status(201).json({
      success: true,
      log: callLog,
      caregiverNotified: Boolean(caregiverLink?.caregiverId),
    });
  } catch (error) {
    console.error("logAmbulanceCall error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to log ambulance call",
    });
  }
};

export const claimRelay = async (req, res) => {
  try {
    if (!requireRole(req, res, DELIVERY_ROLE)) return;

    const now = new Date();
    const relay = await EmergencyRelay.findOneAndUpdate(
      { _id: req.params.relayId, status: "broadcasting" },
      {
        $set: {
          status: "claimed",
          claimedBy: req.user._id,
          claimedAt: now,
          lastEscalatedAt: now,
        },
      },
      { new: true },
    ).populate("claimedBy", "name");

    if (!relay) {
      return res.status(409).json({
        success: false,
        message: "Relay already claimed or unavailable",
      });
    }

    notifyRelayClaimed(safeRelayForSocket(relay));
    return res.json({ success: true, relay });
  } catch (error) {
    console.error("claimRelay error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to claim relay" });
  }
};

export const cancelRelay = async (req, res) => {
  try {
    const relay = await EmergencyRelay.findById(req.params.relayId);
    if (!relay) {
      return res
        .status(404)
        .json({ success: false, message: "Relay not found" });
    }

    if (String(relay.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    relay.status = "cancelled";
    relay.resolvedAt = new Date();
    await relay.save();

    if (relay.claimedBy) {
      emitToUser(String(relay.claimedBy), "emergency:cancelled", {
        relay: safeRelayForSocket(relay),
      });
    }
    emitToUser(String(relay.userId), "emergency:cancelled", {
      relay: safeRelayForSocket(relay),
    });

    await upsertRelayHistory(relay, "cancelled");

    return res.json({ success: true, relay });
  } catch (error) {
    console.error("cancelRelay error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to cancel relay" });
  }
};

export const resolveRelay = async (req, res) => {
  try {
    if (!requireRole(req, res, DELIVERY_ROLE)) return;

    const relay = await EmergencyRelay.findById(req.params.relayId);
    if (!relay) {
      return res
        .status(404)
        .json({ success: false, message: "Relay not found" });
    }

    if (String(relay.claimedBy || "") !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    relay.status = "delivered";
    relay.resolvedAt = new Date();
    await relay.save();
    await upsertRelayHistory(relay, "delivered");

    emitToUser(String(relay.userId), "emergency:updated", {
      relay: safeRelayForSocket(relay),
    });

    return res.json({ success: true, relay });
  } catch (error) {
    console.error("resolveRelay error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resolve relay" });
  }
};

export const getActiveRelay = async (req, res) => {
  try {
    const relay = await EmergencyRelay.findOne({
      userId: req.user._id,
      status: { $in: ["broadcasting", "claimed"] },
    })
      .populate("claimedBy", "name")
      .sort({ createdAt: -1 });

    return res.json({ success: true, relay: relay || null });
  } catch (error) {
    console.error("getActiveRelay error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch active relay" });
  }
};

export const getActiveRelays = async (req, res) => {
  try {
    if (!requireRole(req, res, DELIVERY_ROLE)) return;

    const agentLocation = await AgentLocation.findOne({
      agentId: req.user._id,
    });
    if (!agentLocation?.location?.coordinates?.length) {
      return res.json({ success: true, noLocation: true, relays: [] });
    }

    const [lng, lat] = agentLocation.location.coordinates;

    const relays = await EmergencyRelay.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMeters",
          spherical: true,
          query: { status: "broadcasting" },
        },
      },
      {
        $match: {
          $expr: {
            $lte: ["$distanceMeters", { $multiply: ["$radiusKm", 1000] }],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "patient",
        },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
    ]);

    const data = relays.map((relay) => {
      const patientFirstName = String(relay.patient?.name || "Patient").split(
        " ",
      )[0];
      return {
        ...relay,
        patientFirstName,
        distanceKm: Number(
          (Number(relay.distanceMeters || 0) / 1000).toFixed(2),
        ),
      };
    });

    return res.json({ success: true, relays: data });
  } catch (error) {
    console.error("getActiveRelays error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch nearby relays" });
  }
};

export const getRelayByToken = async (req, res) => {
  try {
    const relay = await EmergencyRelay.findOne({
      trackingToken: req.params.token,
    })
      .populate("claimedBy", "name")
      .select(
        "status medicines location claimedBy createdAt claimedAt trackingToken resolvedAt",
      );

    if (!relay) {
      return res
        .status(404)
        .json({ success: false, message: "Relay not found" });
    }

    const estimatedArrival = relay.claimedAt
      ? new Date(new Date(relay.claimedAt).getTime() + 15 * 60 * 1000)
      : null;

    return res.json({
      success: true,
      relay: {
        status: relay.status,
        medicines: relay.medicines,
        location: relay.location,
        claimedBy: relay.claimedBy ? { name: relay.claimedBy.name } : null,
        createdAt: relay.createdAt,
        estimatedArrival,
      },
    });
  } catch (error) {
    console.error("getRelayByToken error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch tracking relay" });
  }
};

export const updateEmergencyContact = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { emergencyContact: { name, phone } } },
      { new: true },
    ).select("name email role emergencyContact");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, user });
  } catch (error) {
    console.error("updateEmergencyContact error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update emergency contact" });
  }
};

export const triageSymptoms = async (req, res) => {
  try {
    const symptoms = String(req.body?.symptoms || "").trim();
    if (!symptoms) {
      return res
        .status(400)
        .json({ success: false, message: "Symptoms are required" });
    }

    const prompt =
      `You are a pharmacy triage assistant for a medical emergency app in India. The user has described these symptoms: '${symptoms}'. Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact shape:\n` +
      `{\n` +
      `  'suggestedMedicines': [{ 'name': string, 'quantity': string, 'reason': string }],\n` +
      `  'callAmbulance': boolean,\n` +
      `  'ambulanceReason': string or null,\n` +
      `  'urgencyLevel': 'low' | 'medium' | 'high' | 'critical',\n` +
      `  'disclaimer': string\n` +
      `}\n` +
      `Suggest only medicines that could realistically be delivered by a pharmacy. Max 5 suggestions. If symptoms suggest a life-threatening emergency requiring immediate hospital care, set callAmbulance to true.`;

    const ai = await callAI(TRIAGE_SYSTEM_PROMPT, prompt);
    if (!ai?.answer) {
      return res.json({ success: true, triage: triageFallback });
    }

    const parsed = parseJsonFromAI(ai.answer);
    const payload = {
      suggestedMedicines: normalizeMedicines(parsed.suggestedMedicines || [])
        .slice(0, 5)
        .map((item, index) => ({
          name: item.name,
          quantity: item.quantity,
          reason: String(
            parsed.suggestedMedicines?.[index]?.reason || "",
          ).trim(),
        })),
      callAmbulance: Boolean(parsed.callAmbulance),
      ambulanceReason: parsed.ambulanceReason || null,
      urgencyLevel: ["low", "medium", "high", "critical"].includes(
        String(parsed.urgencyLevel || "").toLowerCase(),
      )
        ? String(parsed.urgencyLevel).toLowerCase()
        : "medium",
      disclaimer:
        String(parsed.disclaimer || "").trim() ||
        "This triage guidance is informational. Consult a clinician for urgent care.",
    };

    return res.json({ success: true, triage: payload });
  } catch (error) {
    console.error("triageSymptoms error", error);
    return res.json({ success: true, triage: triageFallback });
  }
};

export const getFallbackPharmacies = async (req, res) => {
  const lat = Number(req.query?.lat);
  const lng = Number(req.query?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({
      success: false,
      message: "lat and lng are required query params",
    });
  }

  try {
    const hospitals = await Hospital.find({ isActive: true });
    
    const nearest = hospitals
      .map((item) => ({
        ...item.toObject(),
        distanceKm: Number(
          haversineDistanceKm(
            { lat, lng },
            { lat: item.lat, lng: item.lng },
          ).toFixed(2),
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);

    return res.json({
      success: true,
      pharmacies: nearest,
      message: "Nearby hospital pharmacies that may have stock",
    });
  } catch (error) {
    console.error("getFallbackPharmacies error", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching hospitals",
    });
  }
};

export const getRelayHistory = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      RelayHistory.find({ userId: req.user._id })
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit),
      RelayHistory.countDocuments({ userId: req.user._id }),
    ]);

    return res.json({
      success: true,
      history: items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("getRelayHistory error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch history" });
  }
};

export const getRelayHistoryById = async (req, res) => {
  try {
    const item = await RelayHistory.findOne({
      _id: req.params.historyId,
      userId: req.user._id,
    });
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "History not found" });
    }
    return res.json({ success: true, history: item });
  } catch (error) {
    console.error("getRelayHistoryById error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch history item" });
  }
};

export const reorderRelayHistory = async (req, res) => {
  try {
    const history = await RelayHistory.findOne({
      _id: req.params.historyId,
      userId: req.user._id,
    });
    if (!history) {
      return res
        .status(404)
        .json({ success: false, message: "History not found" });
    }

    const medicines = Array.isArray(history.medicines) ? history.medicines : [];
    const added = [];
    const notFound = [];

    for (const med of medicines) {
      const safe = String(med.name || "").trim();
      if (!safe) continue;
      const escaped = safe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const product = await Product.findOne({
        name: { $regex: escaped, $options: "i" },
      }).select("_id name price image");

      if (product) {
        added.push({
          productId: product._id,
          name: product.name,
          quantity: med.quantity || "1",
          price: Number(product.price || 0),
          image: product.image || "",
        });
      } else {
        notFound.push({ name: safe, quantity: med.quantity || "1" });
      }
    }

    history.reorderedAt = new Date();
    await history.save();

    return res.json({ success: true, added, notFound });
  } catch (error) {
    console.error("reorderRelayHistory error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to reorder medicines" });
  }
};
