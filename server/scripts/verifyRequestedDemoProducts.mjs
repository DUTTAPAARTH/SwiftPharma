import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../src/models/Product.js";

dotenv.config({ path: ".env" });

const TARGET_NAMES = [
  "TAB. ABCIXIMAB",
  "TAB. VOMILAST",
  "CAP. ZOCLAR 500",
  "TAB. GESTAKIND 10/SR",
];

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error("MONGO_URI is missing in server/.env");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const docs = await Product.find({ name: { $in: TARGET_NAMES } })
    .select("name price composition sku stock")
    .lean();

  console.log(
    JSON.stringify(
      {
        requested: TARGET_NAMES,
        foundCount: docs.length,
        found: docs,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Verification failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
