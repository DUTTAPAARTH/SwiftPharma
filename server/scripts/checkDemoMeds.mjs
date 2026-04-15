import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../src/models/Product.js";

dotenv.config({ path: ".env" });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const docs = await Product.find({
    name: { $regex: "ABCIXIMAB|VOMILAST|ZOCLAR|GESTAKIND", $options: "i" },
  })
    .select("name sku")
    .lean();

  console.log(JSON.stringify({ count: docs.length, docs }, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
