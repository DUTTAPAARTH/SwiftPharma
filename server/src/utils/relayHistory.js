import RelayHistory from "../models/RelayHistory.js";
import User from "../models/User.js";

const minutesBetween = (from, to) => {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Number((ms / 60000).toFixed(1));
};

export const upsertRelayHistory = async (relayLike, outcome) => {
  if (!relayLike?._id || !relayLike?.userId) return null;

  let agentName = null;
  if (relayLike.claimedBy) {
    const agent = await User.findById(relayLike.claimedBy).select("name");
    agentName = agent?.name || null;
  }

  const requestedAt = relayLike.createdAt || new Date();
  const resolvedAt = relayLike.resolvedAt || new Date();

  const payload = {
    relayId: relayLike._id,
    userId: relayLike.userId,
    medicines: relayLike.medicines || [],
    requestedAt,
    claimedAt: relayLike.claimedAt || null,
    resolvedAt,
    claimDurationMinutes: minutesBetween(requestedAt, relayLike.claimedAt),
    totalDurationMinutes: minutesBetween(requestedAt, resolvedAt) || 0,
    outcome,
    agentName,
    escalationLevel: Number(relayLike.escalationLevel || 0),
  };

  return RelayHistory.findOneAndUpdate(
    { relayId: relayLike._id },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};
