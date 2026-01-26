import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "../src/config/db.js";
import Product from "../src/models/Product.js";
import Category from "../src/models/Category.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Category mapping based on medicine composition/name patterns
const categoryMapping = {
  "fever-pain-relief": [
    "paracetamol",
    "ibuprofen",
    "diclofenac",
    "aspirin",
    "aceclofenac",
    "nimesulide",
    "ketoprofen",
    "piroxicam",
    "naproxen",
    "mefenamic",
    "dolo",
    "crocin",
    "combiflam",
    "brufen",
    "pain",
    "fever",
  ],
  "diabetes-care": [
    "metformin",
    "glibenclamide",
    "gliclazide",
    "glimepiride",
    "insulin",
    "sitagliptin",
    "vildagliptin",
    "pioglitazone",
    "glucose",
    "diabetic",
    "glycomet",
    "januvia",
  ],
  "heart-health": [
    "atorvastatin",
    "rosuvastatin",
    "simvastatin",
    "amlodipine",
    "atenolol",
    "metoprolol",
    "ramipril",
    "enalapril",
    "losartan",
    "telmisartan",
    "clopidogrel",
    "aspirin",
    "cardiac",
    "lipitor",
    "crestor",
  ],
  "respiratory-allergy": [
    "cetirizine",
    "levocetirizine",
    "montelukast",
    "salbutamol",
    "levosalbutamol",
    "budesonide",
    "formoterol",
    "terbutaline",
    "ascoril",
    "allegra",
    "fexofenadine",
    "pheniramine",
    "avil",
    "inhaler",
    "cough",
    "asthma",
    "allergy",
  ],
  "gut-health": [
    "omeprazole",
    "pantoprazole",
    "rabeprazole",
    "esomeprazole",
    "ranitidine",
    "domperidone",
    "ondansetron",
    "loperamide",
    "lactobacillus",
    "probiotic",
    "digestion",
    "acidity",
    "antacid",
  ],
  "vitamins-immunity": [
    "vitamin",
    "calcium",
    "iron",
    "zinc",
    "folic",
    "omega",
    "multivitamin",
    "supplement",
    "b12",
    "d3",
    "c ",
    "biotin",
    "immunity",
  ],
  "skin-personal-care": [
    "betnovate",
    "clotrimazole",
    "ketoconazole",
    "moisturizer",
    "sunscreen",
    "antifungal",
    "antibiotic cream",
    "skin",
    "derma",
    "ointment",
    "cream",
    "lotion",
  ],
  "baby-mother-care": [
    "baby",
    "infant",
    "pediatric",
    "gripe water",
    "lactation",
    "prenatal",
    "postnatal",
    "mother",
  ],
  "medical-devices": [
    "thermometer",
    "glucometer",
    "bp monitor",
    "nebulizer",
    "oximeter",
    "syringe",
    "bandage",
    "device",
  ],
};

function categorizeProduct(name, composition) {
  const searchText = `${name} ${composition}`.toLowerCase();

  for (const [slug, keywords] of Object.entries(categoryMapping)) {
    if (keywords.some((keyword) => searchText.includes(keyword))) {
      return slug;
    }
  }

  // Default to vitamins-immunity for uncategorized
  return "vitamins-immunity";
}

function getMedicineImage(name, type, packSize) {
  // Determine medicine form
  const form = packSize?.toLowerCase() || type?.toLowerCase() || "";

  let imageType = "pills"; // default
  if (form.includes("tablet")) imageType = "tablet";
  else if (form.includes("capsule")) imageType = "capsule";
  else if (form.includes("syrup") || form.includes("liquid"))
    imageType = "syrup";
  else if (form.includes("injection") || form.includes("ampoule"))
    imageType = "injection";
  else if (
    form.includes("cream") ||
    form.includes("ointment") ||
    form.includes("gel")
  )
    imageType = "cream";
  else if (form.includes("drops")) imageType = "drops";
  else if (form.includes("inhaler")) imageType = "inhaler";

  // Use Unsplash images for different medicine types
  const imageUrls = {
    tablet:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop",
    capsule:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=400&fit=crop",
    syrup:
      "https://images.unsplash.com/photo-1587854680352-926d68b49ea7?w=400&h=400&fit=crop",
    injection:
      "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400&h=400&fit=crop",
    cream:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop",
    drops:
      "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&h=400&fit=crop",
    inhaler:
      "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=400&h=400&fit=crop",
    pills:
      "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&h=400&fit=crop",
  };

  return [imageUrls[imageType]];
}

async function seedMedicinesFromCSV() {
  try {
    await connectDB();

    // Load categories
    console.log("📋 Loading categories...");
    const categories = await Category.find({});
    const categoryMap = {};
    categories.forEach((cat) => {
      categoryMap[cat.slug] = cat._id;
    });

    console.log(`✅ Loaded ${categories.length} categories`);

    // Clear existing products
    console.log("🔄 Clearing existing products...");
    await Product.deleteMany({});

    // Read CSV file
    const csvPath = path.join(
      __dirname,
      "../../client/public/assets/A_Z_medicines_dataset_of_Indi.csv",
    );
    console.log("📖 Reading CSV file...");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n");

    // Parse CSV (skip header)
    const products = [];
    let processed = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line (handle commas in quoted fields)
      const fields = line.split(",");
      if (fields.length < 9) {
        skipped++;
        continue;
      }

      const [
        id,
        name,
        price,
        isDiscontinued,
        manufacturer,
        type,
        packSize,
        comp1,
        comp2,
      ] = fields;

      // Skip discontinued medicines
      if (isDiscontinued === "TRUE") {
        skipped++;
        continue;
      }

      // Clean data
      const cleanName = name?.trim();
      const cleanPrice = parseFloat(price?.replace(/[^\d.]/g, "")) || 99;
      const composition = `${comp1 || ""} ${comp2 || ""}`.trim();

      if (!cleanName || cleanName.length < 2) {
        skipped++;
        continue;
      }

      // Categorize
      const categorySlug = categorizeProduct(cleanName, composition);
      const categoryId = categoryMap[categorySlug];

      if (!categoryId) {
        skipped++;
        continue;
      }

      // Create product
      products.push({
        name: cleanName,
        slug: cleanName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        description: composition || "Medicine",
        category: categoryId,
        price: cleanPrice,
        mrp: Math.round(cleanPrice * 1.15), // 15% markup for MRP
        discount: Math.floor(Math.random() * 20) + 5, // 5-25% discount
        stock: Math.floor(Math.random() * 200) + 50,
        manufacturer: manufacturer?.trim() || "Unknown",
        dosageForm: packSize?.includes("tablet")
          ? "Tablet"
          : packSize?.includes("capsule")
            ? "Capsule"
            : packSize?.includes("syrup")
              ? "Syrup"
              : packSize?.includes("injection")
                ? "Injection"
                : "Other",
        requiresPrescription: type === "allopathy",
        rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
        reviewCount: Math.floor(Math.random() * 500),
        tags: [],
        images: getMedicineImage(cleanName, type, packSize),
      });

      processed++;

      // Batch insert every 1000 products
      if (products.length >= 1000) {
        await Product.insertMany(products);
        console.log(`   ✓ Inserted ${processed} products...`);
        products.length = 0; // Clear array
      }
    }

    // Insert remaining products
    if (products.length > 0) {
      await Product.insertMany(products);
    }

    console.log(`\n✅ Successfully seeded ${processed} medicines`);
    console.log(`⚠️  Skipped ${skipped} items (discontinued/invalid)`);

    // Update category product counts
    console.log("\n📊 Updating category counts...");
    for (const cat of categories) {
      const count = await Product.countDocuments({ category: cat._id });
      cat.productCount = count;
      await cat.save();
      console.log(`   ${cat.name}: ${count} products`);
    }

    console.log("\n🎉 Database seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedMedicinesFromCSV();
