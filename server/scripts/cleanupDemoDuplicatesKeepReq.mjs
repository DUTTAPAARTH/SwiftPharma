import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../src/models/Product.js";

dotenv.config({ path: ".env" });

const KEEP_SKUS = new Set([
  "DEMO-REQ-ABCIXIMAB-TAB",
  "DEMO-REQ-VOMILAST-TAB",
  "DEMO-REQ-ZOCLAR500-CAP",
  "DEMO-REQ-GESTAKIND10SR-TAB",
]);

const MEDICINE_KEYS = ["ABCIXIMAB", "VOMILAST", "ZOCLAR", "GESTAKIND"];

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error("MONGO_URI is missing in server/.env");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const candidateDocs = await Product.find({
    $or: [
      { name: { $regex: MEDICINE_KEYS.join("|"), $options: "i" } },
      { sku: { $regex: "^DEMO-", $options: "i" } },
    ],
  })
    .select("name sku")
    .lean();

  const toDelete = candidateDocs.filter((doc) => {
    const sku = String(doc?.sku || "");
    const name = String(doc?.name || "");

    const isTargetFamily = MEDICINE_KEYS.some((key) =>
      name.toUpperCase().includes(key),
    );

    if (!isTargetFamily) return false;
    if (!sku.toUpperCase().startsWith("DEMO-")) return false;
    return !KEEP_SKUS.has(sku);
  });

  const ids = toDelete.map((doc) => doc._id);
  let deletedCount = 0;
  if (ids.length) {
    const result = await Product.deleteMany({ _id: { $in: ids } });
    deletedCount = Number(result?.deletedCount || 0);
  }

  const finalDocs = await Product.find({
    name: {
      $in: [
        "TAB. ABCIXIMAB",
        "TAB. VOMILAST",
        "CAP. ZOCLAR 500",
        "TAB. GESTAKIND 10/SR",
      ],
    },
  })
    .select("name sku price")
    .lean();

  console.log(
    JSON.stringify(
      {
        success: true,
        deletedCount,
        deleted: toDelete.map((doc) => ({ id: String(doc._id), name: doc.name, sku: doc.sku })),
        remainingCanonical: finalDocs,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Cleanup failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
