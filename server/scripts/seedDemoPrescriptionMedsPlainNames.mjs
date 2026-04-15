import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../src/models/Product.js";

dotenv.config({ path: ".env" });

const DEMO_MEDS_PLAIN = [
  {
    name: "ABCIXIMAB",
    description: "Demo catalog entry for exact-name lookup compatibility.",
    brand: "Swift Demo",
    manufacturer: "SwiftPharma Labs",
    composition: "Abciximab",
    strength: "As directed",
    dosageForm: "Tablet",
    packSize: "1 strip",
    price: 349,
    mrp: 399,
    stock: 120,
    prescriptionRequired: true,
    isRx: true,
    isActive: true,
    image: "https://via.placeholder.com/300x300?text=ABCIXIMAB",
    sku: "DEMO-ABCIXIMAB-PLAIN",
  },
  {
    name: "VOMILAST",
    description: "Demo catalog entry for exact-name lookup compatibility.",
    brand: "Swift Demo",
    manufacturer: "SwiftPharma Labs",
    composition: "Vomilast",
    strength: "As directed",
    dosageForm: "Tablet",
    packSize: "1 strip",
    price: 129,
    mrp: 159,
    stock: 150,
    prescriptionRequired: true,
    isRx: true,
    isActive: true,
    image: "https://via.placeholder.com/300x300?text=VOMILAST",
    sku: "DEMO-VOMILAST-PLAIN",
  },
  {
    name: "ZOCLAR 500",
    description: "Demo catalog entry for exact-name lookup compatibility.",
    brand: "Swift Demo",
    manufacturer: "SwiftPharma Labs",
    composition: "Clarithromycin",
    strength: "500 mg",
    dosageForm: "Capsule",
    packSize: "1 strip",
    price: 239,
    mrp: 289,
    stock: 110,
    prescriptionRequired: true,
    isRx: true,
    isActive: true,
    image: "https://via.placeholder.com/300x300?text=ZOCLAR+500",
    sku: "DEMO-ZOCLAR500-PLAIN",
  },
  {
    name: "GESTAKIND 10/SR",
    description: "Demo catalog entry for exact-name lookup compatibility.",
    brand: "Swift Demo",
    manufacturer: "SwiftPharma Labs",
    composition: "Progesterone",
    strength: "10 mg SR",
    dosageForm: "Tablet",
    packSize: "1 strip",
    price: 189,
    mrp: 229,
    stock: 100,
    prescriptionRequired: true,
    isRx: true,
    isActive: true,
    image: "https://via.placeholder.com/300x300?text=GESTAKIND+10%2FSR",
    sku: "DEMO-GESTAKIND10SR-PLAIN",
  },
];

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error("MONGO_URI is missing in server/.env");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const products = [];
  for (const med of DEMO_MEDS_PLAIN) {
    const updated = await Product.findOneAndUpdate(
      { name: med.name },
      { $set: med },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    products.push({ id: String(updated._id), name: updated.name, sku: updated.sku });
  }

  console.log(JSON.stringify({ success: true, upsertedCount: products.length, products }, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Failed to seed plain-name demo medicines:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
