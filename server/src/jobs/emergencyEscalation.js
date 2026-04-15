import cron from "node-cron";
import EmergencyRelay from "../models/EmergencyRelay.js";
import AgentLocation from "../models/AgentLocation.js";
import { broadcastEmergency, emitToUser } from "../socket.js";
import { kmToSphereRadians } from "../utils/emergencyGeo.js";

let escalationStarted = false;

const findAgentsWithinRadius = async (relay) => {
  const radiusKm = Number(relay.radiusKm || 5);
  const lat = Number(relay.location?.lat);
  const lng = Number(relay.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  const rows = await AgentLocation.find({
    location: {
      $geoWithin: {
        $centerSphere: [[lng, lat], kmToSphereRadians(radiusKm)],
      },
    },
  }).select("agentId");

  return rows.map((row) => String(row.agentId));
};

const escalateRelay = async (relay, level, radiusKm) => {
  const now = new Date();
  const candidates = await findAgentsWithinRadius({
    ...relay.toObject(),
    radiusKm,
  });
  const already = new Set(
    (relay.notifiedAgentIds || []).map((id) => String(id)),
  );
  const fresh = candidates.filter((id) => !already.has(String(id)));

  if (fresh.length) {
    broadcastEmergency(
      { ...relay.toObject(), radiusKm, escalationLevel: level },
      fresh,
    );
  }

  relay.escalationLevel = level;
  relay.radiusKm = radiusKm;
  relay.lastEscalatedAt = now;
  relay.notifiedAgentIds = [...already, ...fresh];
  relay.escalationHistory = Array.isArray(relay.escalationHistory)
    ? relay.escalationHistory
    : [];
  relay.escalationHistory.push({
    level,
    radiusKm,
    escalatedAt: now,
    newAgentCount: fresh.length,
  });

  await relay.save();

  emitToUser(String(relay.userId), "emergency:escalated", {
    relayId: relay._id,
    level,
    radiusKm,
    newAgentCount: fresh.length,
  });
};

const switchToFallback = async (relay) => {
  relay.escalationLevel = 3;
  relay.lastEscalatedAt = new Date();
  relay.escalationHistory = Array.isArray(relay.escalationHistory)
    ? relay.escalationHistory
    : [];
  relay.escalationHistory.push({
    level: 3,
    radiusKm: Number(relay.radiusKm || 20),
    escalatedAt: new Date(),
    newAgentCount: 0,
  });
  await relay.save();
  emitToUser(String(relay.userId), "emergency:fallback", {
    relayId: relay._id,
  });
};

export const startEmergencyEscalationJob = () => {
  if (escalationStarted) return;

  cron.schedule("*/2 * * * *", async () => {
    try {
      const relays = await EmergencyRelay.find({ status: "broadcasting" });
      const now = Date.now();

      for (const relay of relays) {
        const lastActionAt = new Date(
          relay.lastEscalatedAt || relay.createdAt,
        ).getTime();
        const minutesSinceLastAction = (now - lastActionAt) / 60000;

        if (minutesSinceLastAction < 5) continue;

        if (Number(relay.escalationLevel || 0) === 0) {
          await escalateRelay(relay, 1, 10);
          continue;
        }

        if (Number(relay.escalationLevel || 0) === 1) {
          await escalateRelay(relay, 2, 20);
          continue;
        }

        if (Number(relay.escalationLevel || 0) === 2) {
          await switchToFallback(relay);
        }
      }
    } catch (error) {
      console.error("[emergencyEscalation] tick failed", error);
    }
  });

  escalationStarted = true;
  console.log("[emergencyEscalation] started (every 2 minutes)");
};
