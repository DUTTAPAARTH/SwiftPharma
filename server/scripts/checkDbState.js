import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

await mongoose.connect(process.env.MONGO_URI, { tls: true, serverSelectionTimeoutMS: 10000 });

const Order = (await import("../src/models/Order.js")).default;
const User = (await import("../src/models/User.js")).default;
const Product = (await import("../src/models/Product.js")).default;

const counts = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
const users = await User.find({}, { email: 1, role: 1 }).limit(20);
const totalOrders = await Order.countDocuments();

console.log("TOTAL ORDERS:", totalOrders);
console.log("BY STATUS:", JSON.stringify(counts, null, 2));
console.log("USERS:", users.map(u => `${u._id} ${u.email} (${u.role})`).join("\n"));

await mongoose.disconnect();
