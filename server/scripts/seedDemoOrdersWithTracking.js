/**
 * seedDemoOrdersWithTracking.js
 * Creates demo orders (Out for Delivery) with live tracking for every user.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

await mongoose.connect(process.env.MONGO_URI, {
  tls: true,
  tlsAllowInvalidCertificates: false,
  serverSelectionTimeoutMS: 15000,
});
console.log("✅ Connected to MongoDB");

const Order   = (await import("../src/models/Order.js")).default;
const User    = (await import("../src/models/User.js")).default;
const Product = (await import("../src/models/Product.js")).default;

// ── Tracking helpers ──────────────────────────────────────────────────────
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
const randomStart = () => ({
  lat: Number((KOLKATA.lat + (Math.random() - 0.5) * 0.025).toFixed(6)),
  lng: Number((KOLKATA.lng + (Math.random() - 0.5) * 0.025).toFixed(6)),
});

// ── Demo addresses per user ────────────────────────────────────────────────
const DEMO_ADDRESSES = [
  "12 Park Street, Kolkata, West Bengal 700016",
  "45 Salt Lake Sector V, Kolkata, West Bengal 700091",
  "8 Gariahat Road, Kolkata, West Bengal 700019",
  "22 Ballygunge Circular Road, Kolkata, West Bengal 700019",
  "67 Rashbehari Avenue, Kolkata, West Bengal 700026",
];

const AGENT_NAMES = [
  "Rajesh Kumar",
  "Amit Sharma",
  "Priya Singh",
  "Sunil Das",
  "Mohan Roy",
];

// ── Per-user order templates ────────────────────────────────────────────────
const ORDER_TEMPLATES = [
  {
    statusHistory_statuses: ["Placed", "Approved", "Packed", "Out for Delivery"],
    etaMinutes: 18,
  },
  {
    statusHistory_statuses: ["Placed", "Approved", "Packed", "Out for Delivery"],
    etaMinutes: 35,
  },
  {
    statusHistory_statuses: ["Placed", "Approved", "Out for Delivery"],
    etaMinutes: 12,
  },
];

// ── Fetch users and some products ─────────────────────────────────────────
const users    = await User.find({});
const products = await Product.find({}).limit(30);

if (!products.length) {
  console.error("❌ No products found — run seedProducts.js first");
  process.exit(1);
}

console.log(`👥 Users: ${users.length}  |  🛍  Products available: ${products.length}\n`);

let created = 0;

for (let ui = 0; ui < users.length; ui++) {
  const user    = users[ui];
  const tmpl    = ORDER_TEMPLATES[ui % ORDER_TEMPLATES.length];
  const address = DEMO_ADDRESSES[ui % DEMO_ADDRESSES.length];
  const agent   = AGENT_NAMES[ui % AGENT_NAMES.length];
  const now     = new Date();

  // Pick 2–4 random products for this order
  const picked = products
    .sort(() => Math.random() - 0.5)
    .slice(0, 2 + (ui % 3));

  const items = picked.map(p => ({
    product: p._id,
    name: p.name || "Medicine",
    quantity: 1 + (Math.floor(Math.random() * 2)),
    price: p.price || 99,
  }));

  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);

  // Build status history
  const statusHistory = tmpl.statusHistory_statuses.map((s, idx) => ({
    status: s,
    note: idx === 0 ? "Order placed" : `Status updated to ${s}`,
    changedAt: new Date(now.getTime() - (tmpl.statusHistory_statuses.length - idx) * 30 * 60 * 1000),
  }));

  // Build tracking
  const dest    = resolveDestination(address);
  const current = randomStart();

  const tracking = {
    deliveryAgentName: agent,
    currentLocation: {
      lat: current.lat,
      lng: current.lng,
      updatedAt: now,
    },
    destinationLocation: {
      lat: dest.lat,
      lng: dest.lng,
    },
    estimatedDeliveryTime: new Date(now.getTime() + tmpl.etaMinutes * 60 * 1000),
    statusHistory: [
      { status: "out_for_delivery", description: "Order picked up from store", timestamp: new Date(now.getTime() - 20 * 60 * 1000) },
      { status: "out_for_delivery", description: "Agent on the way", timestamp: now },
    ],
  };

  const order = new Order({
    user:            user._id,
    items,
    status:          "Out for Delivery",
    address,
    totalAmount,
    trackingStartedAt: new Date(now.getTime() - 20 * 60 * 1000),
    tracking,
    statusHistory,
    payment: {
      method: "upi",
      transactionId: `TXN${Date.now()}${ui}`,
      amount: totalAmount,
    },
  });

  await order.save();
  console.log(`  ✅  ${user.email}  →  Order ${order._id}  ETA: ${tmpl.etaMinutes} min  Agent: ${agent}`);
  created++;
}

console.log(`\n🎉 Created ${created} demo order(s) with live tracking!\n`);
console.log("All users can now see the live map on their order tracking page.");
await mongoose.disconnect();
