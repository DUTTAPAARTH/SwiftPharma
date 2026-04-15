import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../src/models/Product.js";

dotenv.config({ path: ".env" });

const DEMO_PRODUCTS = [
  {
    name: "TAB. ABCIXIMAB",
    description: "Demo product for testing prescription-to-cart and checkout flows.",
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
    sku: "DEMO-REQ-ABCIXIMAB-TAB",
  },
  {
    name: "TAB. VOMILAST",
    description: "Demo product for testing prescription-to-cart and checkout flows.",
    brand: "Swift Demo",
    manufacturer: "SwiftPharma Labs",
    composition: "Doxylamine 10 mg + Pyridoxine 10 mg + Folic Acid 2.5 mg",
    strength: "As directed",
    dosageForm: "Tablet",
    packSize: "1 strip",
    price: 189,
    mrp: 239,
    stock: 140,
    prescriptionRequired: true,
    isRx: true,
    isActive: true,
    image: "https://via.placeholder.com/300x300?text=TAB.+VOMILAST",
    sku: "DEMO-REQ-VOMILAST-TAB",
  },
  {
    name: "CAP. ZOCLAR 500",
    description: "Demo product for testing prescription-to-cart and checkout flows.",
    brand: "Swift Demo",
    manufacturer: "SwiftPharma Labs",
    composition: "Clarithromycin IP 500 mg",
    strength: "500 mg",
    dosageForm: "Capsule",
    packSize: "1 strip",
    price: 259,
    mrp: 309,
    stock: 110,
    prescriptionRequired: true,
    isRx: true,
    isActive: true,
    image: "https://via.placeholder.com/300x300?text=CAP.+ZOCLAR+500",
    sku: "DEMO-REQ-ZOCLAR500-CAP",
  },
  {
    name: "TAB. GESTAKIND 10/SR",
    description: "Demo product for testing prescription-to-cart and checkout flows.",
    brand: "Swift Demo",
    manufacturer: "SwiftPharma Labs",
    composition: "Isoxsuprine 10 mg",
    strength: "10 mg SR",
    dosageForm: "Tablet",
    packSize: "1 strip",
    price: 169,
    mrp: 219,
    stock: 105,
    prescriptionRequired: true,
    isRx: true,
    isActive: true,
    image: "https://via.placeholder.com/300x300?text=TAB.+GESTAKIND+10%2FSR",
    sku: "DEMO-REQ-GESTAKIND10SR-TAB",
  },
];

const run = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) throw new Error("MONGO_URI is missing in server/.env");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const rows = [];
  for (const product of DEMO_PRODUCTS) {
    const doc = await Product.findOneAndUpdate(
      { name: product.name },
      { $set: product },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    rows.push({
      id: String(doc._id),
      name: doc.name,
      price: doc.price,
      composition: doc.composition,
      sku: doc.sku,
    });
  }

  console.log(JSON.stringify({ success: true, upsertedCount: rows.length, products: rows }, null, 2));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Failed to seed requested demo products:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
