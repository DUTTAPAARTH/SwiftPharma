import cron from "node-cron";
import Order from "../models/Order.js";
import {
  normalizeStatusKey,
  ensureTrackingInitialized,
  appendTrackingEvent,
} from "../utils/orderTracking.js";

let simulatorStarted = false;

const lerp = (start, end, t) => start + (end - start) * t;

const jitter = () => (Math.random() - 0.5) * 0.0004;

const distance = (a, b) => {
  const lat = Number(a?.lat || 0) - Number(b?.lat || 0);
  const lng = Number(a?.lng || 0) - Number(b?.lng || 0);
  return Math.sqrt(lat * lat + lng * lng);
};

const shouldRunSimulator = () => {
  if (process.env.ENABLE_TRACKING_SIMULATION === "true") return true;
  return process.env.NODE_ENV === "development";
};

const moveActiveDeliveries = async () => {
  const orders = await Order.find({ status: "Out for Delivery" }).limit(100);

  for (const order of orders) {
    if (normalizeStatusKey(order.status) !== "out_for_delivery") {
      continue;
    }

    ensureTrackingInitialized(order);
    const current = order.tracking.currentLocation;
    const destination = order.tracking.destinationLocation;

    const nextLat = lerp(current.lat, destination.lat, 0.22) + jitter();
    const nextLng = lerp(current.lng, destination.lng, 0.22) + jitter();

    order.tracking.currentLocation = {
      lat: Number(nextLat.toFixed(6)),
      lng: Number(nextLng.toFixed(6)),
      updatedAt: new Date(),
    };

    const remaining = distance(order.tracking.currentLocation, destination);
    const etaMinutes = Math.max(1, Math.ceil((remaining / 0.001) * 3));
    order.tracking.estimatedDeliveryTime = new Date(
      Date.now() + etaMinutes * 60 * 1000,
    );

    if (remaining < 0.00075) {
      order.status = "Delivered";
      order.statusHistory = Array.isArray(order.statusHistory)
        ? order.statusHistory
        : [];
      order.statusHistory.push({
        status: "delivered",
        note: "Auto completed by delivery simulator",
        changedAt: new Date(),
      });
      order.tracking.currentLocation = {
        lat: destination.lat,
        lng: destination.lng,
        updatedAt: new Date(),
      };
      order.tracking.estimatedDeliveryTime = new Date();
      appendTrackingEvent(order, "delivered", "Package has been delivered");
    }

    await order.save();
  }
};

export const startTrackingSimulator = () => {
  if (simulatorStarted) return;
  if (!shouldRunSimulator()) return;

  simulatorStarted = true;
  cron.schedule("*/30 * * * * *", async () => {
    try {
      await moveActiveDeliveries();
    } catch (error) {
      console.error("[tracking-simulator] tick failed", error);
    }
  });

  console.log("[tracking-simulator] running every 30 seconds");
};
