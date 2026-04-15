import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../src/models/Product.js";

dotenv.config({ path: ".env" });

const PREFX_SKUS_TO_DELETE = [
  "DEMO-ABCIXIMAB-TAB",
  "DEMO-VOMILAST-TAB",
  "DEMO-ZOCLAR500-CAP",
  "DEMO-GESTAKIND10SR-TAB",
];

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error("MONGO_URI is missing in server/.env");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const before = await Product.find({ sku: { $in: PREFX_SKUS_TO_DELETE } })
    .select("name sku")
    .lean();

  const result = await Product.deleteMany({ sku: { $in: PREFX_SKUS_TO_DELETE } });

  const plainKept = await Product.find({
    sku: {
      $in: [
        "DEMO-ABCIXIMAB-PLAIN",
        "DEMO-VOMILAST-PLAIN",
        "DEMO-ZOCLAR500-PLAIN",
        "DEMO-GESTAKIND10SR-PLAIN",
      ],
    },
  })
    .select("name sku")
    .lean();

  console.log(
    JSON.stringify(
      {
        success: true,
        foundPrefixed: before,
        deletedCount: result.deletedCount || 0,
        plainVariantsRemaining: plainKept,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Failed to cleanup prefixed demo medicines:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
