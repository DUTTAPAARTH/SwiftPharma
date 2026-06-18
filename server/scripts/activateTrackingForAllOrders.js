/**
 * activateTrackingForAllOrders.js
 * Sets every non-delivered / non-cancelled order to "Out for Delivery"
 * and initialises live tracking coordinates so all users see the map.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env");
  process.exit(1);
}

/* ── Inline tracking helpers (avoids ESM import complexity in scripts) ─── */
const KOLKATA = { lat: 22.5726, lng: 88.3639 };

const hashText = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return h;
};

const resolveDestination = (address = "") => {
  const h = hashText(String(address));
  return {
    lat: Number((KOLKATA.lat + ((h % 200) - 100) / 10000).toFixed(6)),
    lng: Number((KOLKATA.lng + ((Math.floor(h / 7) % 200) - 100) / 10000).toFixed(6)),
  };
};

const randomStartPoint = () => ({
  lat: Number((KOLKATA.lat + (Math.random() - 0.5) * 0.03).toFixed(6)),
  lng: Number((KOLKATA.lng + (Math.random() - 0.5) * 0.03).toFixed(6)),
});

/* ── Connect ─────────────────────────────────────────────────────────────── */
await mongoose.connect(MONGO_URI, {
  tls: true,
  tlsAllowInvalidCertificates: false,
  serverSelectionTimeoutMS: 15000,
});
console.log("✅ Connected to MongoDB");

/* ── Load Order model inline ─────────────────────────────────────────────── */
const { default: Order } = await import("../src/models/Order.js");

/* ── Find all orders that are not finished ─────────────────────────────── */
const SKIP_STATUSES = ["Delivered", "Cancelled", "delivered", "cancelled"];

const orders = await Order.find({
  status: { $nin: SKIP_STATUSES },
});

console.log(`\n📦 Found ${orders.length} active order(s) to update\n`);

let updated = 0;
let skipped = 0;

for (const order of orders) {
  try {
    const dest = resolveDestination(order.address || "");
    const current = randomStartPoint();
    const now = new Date();

    // Set status to Out for Delivery
    order.status = "Out for Delivery";

    // Initialize / refresh tracking
    order.tracking = {
      deliveryAgentName: order.tracking?.deliveryAgentName || "SwiftPharma Rider",
      currentLocation: {
        lat: current.lat,
        lng: current.lng,
        updatedAt: now,
      },
      destinationLocation: {
        lat: dest.lat,
        lng: dest.lng,
      },
      estimatedDeliveryTime: new Date(now.getTime() + 30 * 60 * 1000),
      statusHistory: [
        ...(Array.isArray(order.tracking?.statusHistory) ? order.tracking.statusHistory : []),
        { status: "out_for_delivery", description: "Order is on the way", timestamp: now },
      ],
    };

    if (!order.trackingStartedAt) {
      order.trackingStartedAt = now;
    }

    // Add to order status history
    if (!Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push({
      status: "Out for Delivery",
      note: "Activated by admin tracking script",
      changedAt: now,
    });

    await order.save();
    console.log(`  ✅  Order ${order._id}  →  Out for Delivery  (dest: ${dest.lat}, ${dest.lng})`);
    updated++;
  } catch (err) {
    console.error(`  ❌  Order ${order._id} failed:`, err.message);
    skipped++;
  }
}

console.log(`\n🎉 Done!  Updated: ${updated}  |  Skipped/Errors: ${skipped}`);
await mongoose.disconnect();
