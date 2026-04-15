import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../src/models/Product.js";

dotenv.config({ path: ".env" });

const DEMO_MEDS = [
  {
    name: "TAB. ABCIXIMAB",
    description: "Demo catalog entry for prescription flow testing.",
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
    image: "https://via.placeholder.com/300x300?text=TAB.+ABCIXIMAB",
    sku: "DEMO-ABCIXIMAB-TAB",
  },
  {
    name: "TAB. VOMILAST",
    description: "Demo catalog entry for prescription flow testing.",
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
    image: "https://via.placeholder.com/300x300?text=TAB.+VOMILAST",
    sku: "DEMO-VOMILAST-TAB",
  },
  {
    name: "CAP. ZOCLAR 500",
    description: "Demo catalog entry for prescription flow testing.",
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
    image: "https://via.placeholder.com/300x300?text=CAP.+ZOCLAR+500",
    sku: "DEMO-ZOCLAR500-CAP",
  },
  {
    name: "TAB. GESTAKIND 10/SR",
    description: "Demo catalog entry for prescription flow testing.",
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
    image: "https://via.placeholder.com/300x300?text=TAB.+GESTAKIND+10%2FSR",
    sku: "DEMO-GESTAKIND10SR-TAB",
  },
];

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("MONGO_URI is missing in server/.env");
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const results = [];
  for (const med of DEMO_MEDS) {
    const updated = await Product.findOneAndUpdate(
      { name: med.name },
      { $set: med },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    results.push({ id: String(updated._id), name: updated.name, sku: updated.sku, price: updated.price });
  }

  console.log(JSON.stringify({ success: true, upsertedCount: results.length, products: results }, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Failed to seed demo prescription medicines:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
