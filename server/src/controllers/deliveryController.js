import AgentLocation from "../models/AgentLocation.js";
import Order from "../models/Order.js";
import { ORDER_STATUS } from "../utils/constants.js";
import { connectedUsers, getIO } from "../socket.js";

const OUT_FOR_DELIVERY_STATUS =
  ORDER_STATUS.find(
    (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_") === "out_for_delivery",
  ) || "Out for Delivery";

export const listAssignedOrders = (req, res) => res.json([]);
export const updateDelivery = (req, res) =>
  res.json({ message: "delivery updated" });

export const upsertDeliveryLocation = async (req, res) => {
  try {
    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        success: false,
        message: "Valid lat/lng required",
      });
    }

    const now = new Date();

    await AgentLocation.findOneAndUpdate(
      { agentId: req.user._id },
      {
        $set: {
          location: {
            type: "Point",
            coordinates: [lng, lat],
          },
          updatedAt: now,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    const activeOrders = await Order.find({
      assignedAgent: req.user._id,
      status: OUT_FOR_DELIVERY_STATUS,
    }).select("_id user");

    if (activeOrders.length) {
      const io = getIO();
      for (const order of activeOrders) {
        const userId = String(order.user);
        const meta = connectedUsers.get(userId);
        if (!io || !meta?.socketId) continue;
        io.to(meta.socketId).emit("agent:location:update", {
          orderId: order._id,
          lat,
          lng,
          updatedAt: now,
        });
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("upsertDeliveryLocation error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update delivery location",
    });
  }
};
