import EmergencyRelay from "../../models/EmergencyRelay.js";
import User from "../../models/User.js";
import {
  emitRelayUpdate,
  emitToUser,
  notifyRelayClaimed,
} from "../../socket.js";

const minutesBetween = (from, to) => {
  if (!from || !to) return null;
  const diff = (new Date(to).getTime() - new Date(from).getTime()) / 60000;
  if (!Number.isFinite(diff) || diff < 0) return null;
  return Number(diff.toFixed(1));
};

export const getAllRelays = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      EmergencyRelay.find(filter)
        .populate("claimedBy", "name")
        .populate("userId", "name phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      EmergencyRelay.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      relays: items,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("getAllRelays error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch relays" });
  }
};

export const getRelayStats = async (_req, res) => {
  try {
    const [
      totalRelays,
      activeNow,
      claimedOrDelivered,
      expiredUnclaimed,
      last7days,
    ] = await Promise.all([
      EmergencyRelay.countDocuments({}),
      EmergencyRelay.countDocuments({
        status: { $in: ["broadcasting", "claimed"] },
      }),
      EmergencyRelay.find({ status: { $in: ["claimed", "delivered"] } }).select(
        "createdAt claimedAt",
      ),
      EmergencyRelay.countDocuments({
        status: "cancelled",
        claimedAt: null,
        expiresAt: { $lt: new Date() },
      }),
      EmergencyRelay.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const claimTimes = claimedOrDelivered
      .map((item) => minutesBetween(item.createdAt, item.claimedAt))
      .filter((value) => value != null);

    const avgClaimTimeMinutes = claimTimes.length
      ? Number(
          (
            claimTimes.reduce((sum, value) => sum + value, 0) /
            claimTimes.length
          ).toFixed(1),
        )
      : 0;

    const unclaimedRate = totalRelays
      ? Number(((expiredUnclaimed / totalRelays) * 100).toFixed(1))
      : 0;

    const relayCounts = last7days.map((row) => ({
      date: row._id,
      count: row.count,
    }));

    return res.json({
      success: true,
      stats: {
        totalRelays,
        activeNow,
        avgClaimTimeMinutes,
        unclaimedRate,
        relayCounts,
      },
    });
  } catch (error) {
    console.error("getRelayStats error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch relay stats" });
  }
};

export const adminCancelRelay = async (req, res) => {
  try {
    const relay = await EmergencyRelay.findById(req.params.relayId);
    if (!relay) {
      return res
        .status(404)
        .json({ success: false, message: "Relay not found" });
    }

    relay.status = "cancelled";
    relay.resolvedAt = new Date();
    relay.adminNote = String(req.body?.reason || "Admin override").trim();
    await relay.save();

    emitToUser(String(relay.userId), "emergency:cancelled", {
      relay,
      reason: relay.adminNote,
    });
    emitRelayUpdate(relay);

    return res.json({ success: true, relay });
  } catch (error) {
    console.error("adminCancelRelay error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to cancel relay" });
  }
};

export const adminReassignRelay = async (req, res) => {
  try {
    const newAgentId = String(req.body?.newAgentId || "").trim();
    if (!newAgentId) {
      return res
        .status(400)
        .json({ success: false, message: "newAgentId required" });
    }

    const relay = await EmergencyRelay.findOne({
      _id: req.params.relayId,
      status: "claimed",
    });

    if (!relay) {
      return res
        .status(404)
        .json({ success: false, message: "Claimed relay not found" });
    }

    const agent = await User.findById(newAgentId).select("name role");
    if (!agent || String(agent.role || "") !== "delivery") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid delivery agent" });
    }

    relay.claimedBy = agent._id;
    relay.claimedAt = new Date();
    await relay.save();

    const payload = {
      ...relay.toObject(),
      claimedBy: { _id: agent._id, name: agent.name },
    };

    notifyRelayClaimed(payload);
    emitRelayUpdate(payload);

    return res.json({ success: true, relay: payload });
  } catch (error) {
    console.error("adminReassignRelay error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to reassign relay" });
  }
};
