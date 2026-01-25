import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Product from "../src/models/Product.js";
import Category from "../src/models/Category.js";

dotenv.config();

const categories = [
  {
    name: "Fever & Pain Relief",
    slug: "fever-pain-relief",
    description: "Relief for fever, headache, body pain, and inflammation.",
  },
  {
    name: "Diabetes Care",
    slug: "diabetes-care",
    description: "Blood glucose control and diabetes management essentials.",
  },
  {
    name: "Heart Health",
    slug: "heart-health",
    description: "Cardiac wellness and blood pressure support.",
  },
  {
    name: "Respiratory & Allergy",
    slug: "respiratory-allergy",
    description: "Airway relief, inhalers, and anti-allergy essentials.",
  },
  {
    name: "Gut Health",
    slug: "gut-health",
    description: "Acidity relief, digestion, gut motility, and rehydration.",
  },
  {
    name: "Vitamins & Immunity",
    slug: "vitamins-immunity",
    description: "Daily nutrition, immunity boosters, and supplements.",
  },
];

// Default pack sizes and helpers to keep the matrix large without hand-writing hundreds of rows.
const DEFAULT_PACK_SIZES = [10, 15, 20, 30, 60];
const TARGET_COUNT = 560; // aim for ~500-600 medicines

const productTemplates = [
  // Fever & Pain Relief
  {
    name: "Paracetamol",
    brand: "GSK",
    composition: "Paracetamol",
    strengths: [
      { label: "325 mg", factor: 0.9 },
      { label: "500 mg", factor: 1 },
      { label: "650 mg", factor: 1.1 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Syrup", factor: 1.25 },
    ],
    basePrice: 25,
    baseStock: 240,
    prescriptionRequired: false,
    categorySlug: "fever-pain-relief",
  },
  {
    name: "Ibuprofen",
    brand: "Abbott",
    composition: "Ibuprofen",
    strengths: [
      { label: "200 mg", factor: 0.9 },
      { label: "400 mg", factor: 1.1 },
      { label: "600 mg", factor: 1.2 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Suspension", factor: 1.2 },
    ],
    basePrice: 32,
    baseStock: 220,
    prescriptionRequired: false,
    categorySlug: "fever-pain-relief",
  },
  {
    name: "Aceclofenac + Paracetamol",
    brand: "IPCA",
    composition: "Aceclofenac + Paracetamol",
    strengths: [
      { label: "100 mg + 325 mg", factor: 1.2 },
      { label: "100 mg + 500 mg", factor: 1.3 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 55,
    baseStock: 180,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "fever-pain-relief",
  },
  {
    name: "Naproxen",
    brand: "Dr. Reddy's",
    composition: "Naproxen",
    strengths: [
      { label: "250 mg", factor: 1 },
      { label: "500 mg", factor: 1.3 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 60,
    baseStock: 160,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "fever-pain-relief",
  },
  {
    name: "Diclofenac",
    brand: "Novartis",
    composition: "Diclofenac",
    strengths: [
      { label: "50 mg", factor: 1 },
      { label: "75 mg", factor: 1.15 },
      { label: "1% Gel", factor: 0.8 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Gel", factor: 0.9 },
    ],
    basePrice: 58,
    baseStock: 170,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "fever-pain-relief",
  },

  // Diabetes Care
  {
    name: "Metformin",
    brand: "USV",
    composition: "Metformin Hydrochloride",
    strengths: [
      { label: "500 mg", factor: 1 },
      { label: "850 mg", factor: 1.15 },
      { label: "1000 mg", factor: 1.25 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 28,
    baseStock: 210,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "diabetes-care",
  },
  {
    name: "Glimepiride + Metformin",
    brand: "Sun Pharma",
    composition: "Glimepiride + Metformin",
    strengths: [
      { label: "1 mg + 500 mg", factor: 1.1 },
      { label: "2 mg + 500 mg", factor: 1.25 },
      { label: "2 mg + 1000 mg", factor: 1.4 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 65,
    baseStock: 170,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "diabetes-care",
  },
  {
    name: "Dapagliflozin",
    brand: "AstraZeneca",
    composition: "Dapagliflozin",
    strengths: [
      { label: "5 mg", factor: 1 },
      { label: "10 mg", factor: 1.3 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 90,
    baseStock: 140,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "diabetes-care",
  },
  {
    name: "Insulin Glargine",
    brand: "Sanofi",
    composition: "Insulin Glargine",
    strengths: [
      { label: "100 IU/ml", factor: 1.8 },
      { label: "300 IU/ml", factor: 2 },
    ],
    forms: [
      { label: "Injection", factor: 1.6 },
      { label: "Pen", factor: 1.9 },
    ],
    packSizes: [1, 2, 3, 5],
    basePrice: 450,
    baseStock: 90,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "diabetes-care",
  },
  {
    name: "Gliclazide",
    brand: "Torrent",
    composition: "Gliclazide",
    strengths: [
      { label: "40 mg", factor: 1 },
      { label: "60 mg", factor: 1.15 },
      { label: "80 mg", factor: 1.25 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 48,
    baseStock: 160,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "diabetes-care",
  },

  // Heart Health
  {
    name: "Atenolol",
    brand: "IPCA",
    composition: "Atenolol",
    strengths: [
      { label: "25 mg", factor: 0.9 },
      { label: "50 mg", factor: 1 },
      { label: "100 mg", factor: 1.2 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 22,
    baseStock: 200,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "heart-health",
  },
  {
    name: "Telmisartan",
    brand: "Cipla",
    composition: "Telmisartan",
    strengths: [
      { label: "20 mg", factor: 0.9 },
      { label: "40 mg", factor: 1 },
      { label: "80 mg", factor: 1.25 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 40,
    baseStock: 180,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "heart-health",
  },
  {
    name: "Amlodipine",
    brand: "Pfizer",
    composition: "Amlodipine",
    strengths: [
      { label: "2.5 mg", factor: 0.85 },
      { label: "5 mg", factor: 1 },
      { label: "10 mg", factor: 1.2 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 18,
    baseStock: 200,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "heart-health",
  },
  {
    name: "Rosuvastatin",
    brand: "Sun Pharma",
    composition: "Rosuvastatin",
    strengths: [
      { label: "5 mg", factor: 1 },
      { label: "10 mg", factor: 1.15 },
      { label: "20 mg", factor: 1.3 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 55,
    baseStock: 160,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "heart-health",
  },
  {
    name: "Clopidogrel + Aspirin",
    brand: "Dr. Reddy's",
    composition: "Clopidogrel + Aspirin",
    strengths: [
      { label: "75 mg + 75 mg", factor: 1.15 },
      { label: "75 mg + 150 mg", factor: 1.25 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 90,
    baseStock: 150,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "heart-health",
  },
  {
    name: "Losartan",
    brand: "Torrent",
    composition: "Losartan Potassium",
    strengths: [
      { label: "25 mg", factor: 0.95 },
      { label: "50 mg", factor: 1 },
      { label: "100 mg", factor: 1.2 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 34,
    baseStock: 190,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "heart-health",
  },
  {
    name: "Atorvastatin + Fenofibrate",
    brand: "Cipla",
    composition: "Atorvastatin + Fenofibrate",
    strengths: [
      { label: "10 mg + 160 mg", factor: 1.15 },
      { label: "20 mg + 160 mg", factor: 1.3 },
    ],
    forms: [{ label: "Tablet", factor: 1 }],
    basePrice: 110,
    baseStock: 140,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "heart-health",
  },

  // Respiratory & Allergy
  {
    name: "Cetirizine",
    brand: "Glenmark",
    composition: "Cetirizine",
    strengths: [
      { label: "5 mg", factor: 0.9 },
      { label: "10 mg", factor: 1 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Syrup", factor: 1.2 },
    ],
    basePrice: 20,
    baseStock: 230,
    prescriptionRequired: false,
    categorySlug: "respiratory-allergy",
  },
  {
    name: "Montelukast + Levocetirizine",
    brand: "Cipla",
    composition: "Montelukast + Levocetirizine",
    strengths: [
      { label: "10 mg + 5 mg", factor: 1.2 },
      { label: "5 mg + 2.5 mg", factor: 1 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Syrup", factor: 1.25 },
    ],
    basePrice: 70,
    baseStock: 170,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "respiratory-allergy",
  },
  {
    name: "Budesonide Inhaler",
    brand: "AstraZeneca",
    composition: "Budesonide",
    strengths: [
      { label: "100 mcg", factor: 1 },
      { label: "200 mcg", factor: 1.2 },
    ],
    forms: [
      { label: "Inhaler", factor: 1.6 },
      { label: "Nebulizer Suspension", factor: 1.8 },
    ],
    packSizes: [1, 2, 3, 5, 10],
    basePrice: 320,
    baseStock: 130,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "respiratory-allergy",
  },
  {
    name: "Salbutamol",
    brand: "Cipla",
    composition: "Salbutamol",
    strengths: [
      { label: "100 mcg", factor: 1 },
      { label: "200 mcg", factor: 1.25 },
    ],
    forms: [
      { label: "Inhaler", factor: 1.5 },
      { label: "Respirator Solution", factor: 1.6 },
    ],
    packSizes: [1, 2, 3, 5, 10],
    basePrice: 260,
    baseStock: 140,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "respiratory-allergy",
  },
  {
    name: "Fexofenadine",
    brand: "Sanofi",
    composition: "Fexofenadine",
    strengths: [
      { label: "60 mg", factor: 1 },
      { label: "120 mg", factor: 1.2 },
      { label: "180 mg", factor: 1.3 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Syrup", factor: 1.2 },
    ],
    basePrice: 42,
    baseStock: 200,
    prescriptionRequired: false,
    categorySlug: "respiratory-allergy",
  },
  {
    name: "Azithromycin",
    brand: "Pfizer",
    composition: "Azithromycin",
    strengths: [
      { label: "250 mg", factor: 1 },
      { label: "500 mg", factor: 1.25 },
      { label: "200 mg/5ml", factor: 1.15 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Suspension", factor: 1.3 },
    ],
    basePrice: 78,
    baseStock: 150,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "respiratory-allergy",
  },

  // Gut Health
  {
    name: "Pantoprazole",
    brand: "Sun Pharma",
    composition: "Pantoprazole",
    strengths: [
      { label: "20 mg", factor: 0.9 },
      { label: "40 mg", factor: 1 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Injection", factor: 1.4 },
    ],
    basePrice: 45,
    baseStock: 210,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "gut-health",
  },
  {
    name: "Omeprazole + Domperidone",
    brand: "Dr. Reddy's",
    composition: "Omeprazole + Domperidone",
    strengths: [
      { label: "20 mg + 10 mg", factor: 1 },
      { label: "20 mg + 30 mg", factor: 1.2 },
    ],
    forms: [{ label: "Capsule", factor: 1 }],
    basePrice: 52,
    baseStock: 180,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "gut-health",
  },
  {
    name: "ORS Electrolyte",
    brand: "GSK",
    composition: "ORS Salts",
    strengths: [
      { label: "21g Sachet", factor: 1 },
      { label: "1L Ready Mix", factor: 1.4 },
    ],
    forms: [
      { label: "Sachet", factor: 1 },
      { label: "Bottle", factor: 1.15 },
    ],
    packSizes: [5, 10, 20, 30, 50],
    basePrice: 18,
    baseStock: 260,
    prescriptionRequired: false,
    categorySlug: "gut-health",
  },
  {
    name: "Drotaverine",
    brand: "No Spas",
    composition: "Drotaverine Hydrochloride",
    strengths: [
      { label: "40 mg", factor: 1 },
      { label: "80 mg", factor: 1.2 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Injection", factor: 1.4 },
    ],
    basePrice: 48,
    baseStock: 170,
    prescriptionRequired: true,
    isRx: true,
    categorySlug: "gut-health",
  },
  {
    name: "Probiotic",
    brand: "ProGut",
    composition: "Lactobacillus + Bifidobacterium",
    strengths: [
      { label: "2 Billion CFU", factor: 1 },
      { label: "5 Billion CFU", factor: 1.25 },
    ],
    forms: [
      { label: "Capsule", factor: 1 },
      { label: "Sachet", factor: 1.1 },
    ],
    packSizes: [5, 10, 15, 20, 30],
    basePrice: 40,
    baseStock: 190,
    prescriptionRequired: false,
    categorySlug: "gut-health",
  },

  // Vitamins & Immunity
  {
    name: "Vitamin C",
    brand: "Cipla",
    composition: "Ascorbic Acid",
    strengths: [
      { label: "500 mg", factor: 1 },
      { label: "1000 mg", factor: 1.3 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Chewable", factor: 1.05 },
      { label: "Effervescent", factor: 1.15 },
    ],
    basePrice: 25,
    baseStock: 260,
    prescriptionRequired: false,
    categorySlug: "vitamins-immunity",
  },
  {
    name: "Vitamin D3",
    brand: "Mankind",
    composition: "Cholecalciferol",
    strengths: [
      { label: "1000 IU", factor: 0.9 },
      { label: "2000 IU", factor: 1 },
      { label: "60000 IU", factor: 1.5 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Sachet", factor: 1.1 },
      { label: "Drops", factor: 1.05 },
    ],
    basePrice: 35,
    baseStock: 240,
    prescriptionRequired: false,
    categorySlug: "vitamins-immunity",
  },
  {
    name: "Multivitamin",
    brand: "Revital",
    composition: "Multivitamin + Multimineral",
    strengths: [
      { label: "Adult", factor: 1 },
      { label: "Women", factor: 1.05 },
      { label: "Senior", factor: 1.1 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Capsule", factor: 1 },
    ],
    basePrice: 120,
    baseStock: 200,
    prescriptionRequired: false,
    categorySlug: "vitamins-immunity",
  },
  {
    name: "Zinc",
    brand: "Glenmark",
    composition: "Zinc Gluconate",
    strengths: [
      { label: "20 mg", factor: 1 },
      { label: "50 mg", factor: 1.25 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Syrup", factor: 1.1 },
    ],
    basePrice: 22,
    baseStock: 220,
    prescriptionRequired: false,
    categorySlug: "vitamins-immunity",
  },
  {
    name: "Vitamin B-Complex",
    brand: "Merck",
    composition: "Vitamin B-Complex with B12",
    strengths: [
      { label: "Standard", factor: 1 },
      { label: "Strong", factor: 1.2 },
    ],
    forms: [
      { label: "Tablet", factor: 1 },
      { label: "Syrup", factor: 1.1 },
    ],
    basePrice: 38,
    baseStock: 230,
    prescriptionRequired: false,
    categorySlug: "vitamins-immunity",
  },
];

const buildProducts = () => {
  const result = [];
  let idx = 0;

  for (const template of productTemplates) {
    const packs = template.packSizes || DEFAULT_PACK_SIZES;
    for (const strength of template.strengths) {
      for (const form of template.forms) {
        for (const pack of packs) {
          const basePrice = template.basePrice || 50;
          const price = Number(
            (basePrice * strength.factor * form.factor * (pack / 10)).toFixed(
              2,
            ),
          );
          const stockBase = template.baseStock ?? 150;
          const stock = stockBase + (idx % 50) * 3;

          result.push({
            name: `${template.name} ${strength.label} (${form.label}, Pack of ${pack})`,
            brand: template.brand,
            composition: template.composition,
            strength: strength.label,
            price,
            prescriptionRequired: Boolean(template.prescriptionRequired),
            isRx: Boolean(template.isRx ?? template.prescriptionRequired),
            stock,
            categorySlug: template.categorySlug,
          });

          idx += 1;
          if (result.length >= TARGET_COUNT) {
            return result;
          }
        }
      }
    }
  }

  return result;
};

const products = buildProducts();

const seed = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB connected");

    // Create categories (upsert by slug)
    const categoryMap = {};
    for (const cat of categories) {
      const doc = await Category.findOneAndUpdate(
        { slug: cat.slug },
        { $set: cat },
        { upsert: true, new: true },
      );
      categoryMap[cat.slug] = doc._id;
    }

    // Wipe products and insert fresh
    await Product.deleteMany({});

    const docs = products.map((p) => ({
      name: p.name,
      brand: p.brand,
      composition: p.composition,
      strength: p.strength,
      price: p.price,
      prescriptionRequired: p.prescriptionRequired,
      isRx: p.isRx,
      stock: p.stock,
      category: categoryMap[p.categorySlug],
    }));

    await Product.insertMany(docs);
    console.log(`✅ Seeded products: ${docs.length}`);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("ℹ️  Disconnected");
  }
};

seed();
