import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./src/models/User.js";
import Prescription from "./src/models/Prescription.js";

dotenv.config();

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!uri) throw new Error("Mongo URI not found in env");

await mongoose.connect(uri);

const ts = Date.now();
const email = "db.queue.user." + ts + "@swiftpharma.com";

let user = await User.findOne({ email });
if (!user) {
  user = await User.create({
    name: "DB Queue User " + ts,
    email,
    phone: "9000000099",
    role: "customer",
    passwordHash: "manual-test-hash",
  });
}

const rx = await Prescription.create({
  userId: user._id,
  images: ["https://example.com/db-test-prescription.png"],
  ocrText: "DB level queue ingestion test",
  doctorName: "Dr Queue Test",
  issueDate: new Date(),
  medicines: [],
  status: "pending",
});

console.log(JSON.stringify({
  success: true,
  insertedPrescriptionId: String(rx._id),
  insertedUserId: String(user._id),
  insertedUserEmail: user.email,
  insertedStatus: rx.status,
}));

await mongoose.disconnect();
