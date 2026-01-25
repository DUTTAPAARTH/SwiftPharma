import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import csv from "csv-parser";

dotenv.config({ path: ".env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
import Product from "../src/models/Product.js";
import Category from "../src/models/Category.js";

// Generic medicine images (using placeholder URLs for now)
const MEDICINE_IMAGES = {
  tablet: "https://via.placeholder.com/300x300?text=Tablet+Medicine",
  capsule: "https://via.placeholder.com/300x300?text=Capsule+Medicine",
  syrup: "https://via.placeholder.com/300x300?text=Syrup+Medicine",
  injection: "https://via.placeholder.com/300x300?text=Injection+Medicine",
  inhaler: "https://via.placeholder.com/300x300?text=Inhaler+Medicine",
  cream: "https://via.placeholder.com/300x300?text=Cream+Medicine",
  suspension: "https://via.placeholder.com/300x300?text=Suspension+Medicine",
  default: "https://via.placeholder.com/300x300?text=Medicine",
};

// Categorize by composition/therapeutic area
function categorizeByTherapy(composition) {
  const comp = composition.toLowerCase();

  // Antibiotics
  if (
    comp.includes("azithromycin") ||
    comp.includes("amoxycillin") ||
    comp.includes("clavulanic") ||
    comp.includes("erythromycin")
  ) {
    return "Antibiotics";
  }

  // Pain Relief & Anti-Inflammatory
  if (
    comp.includes("paracetamol") ||
    comp.includes("aceclofenac") ||
    comp.includes("diclofenac") ||
    comp.includes("ibuprofen")
  ) {
    return "Pain Relief";
  }

  // Cough & Cold
  if (
    comp.includes("ambroxol") ||
    comp.includes("salbutamol") ||
    comp.includes("levosalbutamol") ||
    comp.includes("phenylephrine") ||
    comp.includes("chlorpheniramine") ||
    comp.includes("dextromethorphan")
  ) {
    return "Cough & Cold";
  }

  // Antacids & Digestive
  if (
    comp.includes("ranitidine") ||
    comp.includes("omeprazole") ||
    comp.includes("domperidone") ||
    comp.includes("rabeprazole")
  ) {
    return "Digestive Health";
  }

  // Allergies & Antihistamines
  if (
    comp.includes("fexofenadine") ||
    comp.includes("hydroxyzine") ||
    comp.includes("pheniramine") ||
    comp.includes("montelukast")
  ) {
    return "Allergy Relief";
  }

  // Anxiety & Sleep
  if (
    comp.includes("alprazolam") ||
    comp.includes("lorazepam") ||
    comp.includes("clonidine")
  ) {
    return "Mental Health";
  }

  // Heart & Blood Pressure
  if (
    comp.includes("amlodipine") ||
    comp.includes("atenolol") ||
    comp.includes("spironolactone") ||
    comp.includes("ticagrelor")
  ) {
    return "Heart Health";
  }

  // Vitamins & Supplements
  if (comp.includes("vitamin") || comp.includes("d3")) {
    return "Wellness";
  }

  // Worm Infection
  if (comp.includes("albendazole")) {
    return "Infections";
  }

  // Respiratory
  if (comp.includes("inhaler") || comp.includes("mdi")) {
    return "Respiratory";
  }

  return "General Medicine";
}

// Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/-+/g, "-");
}

// Get image based on form
function getImage(packSizeLabel) {
  const label = packSizeLabel.toLowerCase();

  if (label.includes("tablet")) return MEDICINE_IMAGES.tablet;
  if (label.includes("capsule")) return MEDICINE_IMAGES.capsule;
  if (label.includes("syrup")) return MEDICINE_IMAGES.syrup;
  if (label.includes("injection")) return MEDICINE_IMAGES.injection;
  if (label.includes("inhaler") || label.includes("mdi"))
    return MEDICINE_IMAGES.inhaler;
  if (label.includes("cream")) return MEDICINE_IMAGES.cream;
  if (label.includes("suspension")) return MEDICINE_IMAGES.suspension;

  return MEDICINE_IMAGES.default;
}

async function seedMedicines() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Create or get categories
    const categories = [
      "Antibiotics",
      "Pain Relief",
      "Cough & Cold",
      "Digestive Health",
      "Allergy Relief",
      "Mental Health",
      "Heart Health",
      "Wellness",
      "Infections",
      "Respiratory",
      "General Medicine",
    ];

    const categoryDocs = {};
    for (const cat of categories) {
      let category = await Category.findOne({ name: cat });
      if (!category) {
        category = await Category.create({
          name: cat,
          slug: generateSlug(cat),
          description: `${cat} medicines and supplements`,
        });
      }
      categoryDocs[cat] = category._id;
    }
    console.log("✅ Categories ready");

    // Read CSV file
    const csvPath = path.join(
      __dirname,
      "..",
      "..",
      "client",
      "public",
      "assets",
      "A_Z_medicines_dataset_of_Indi.csv",
    );

    let medicineCount = 0;
    const medicines = [];

    return await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on("data", (row) => {
          if (row.Is_discontinued === "TRUE") return; // Skip discontinued medicines

          const composition = `${row.short_composition1 || ""} ${
            row.short_composition2 || ""
          }`;
          const therapy = categorizeByTherapy(composition);

          medicines.push({
            name: row.name,
            description: `${row.manufacturer_name} - ${row.type.toUpperCase()}`,
            price: parseFloat(row.price) || 0,
            stock: Math.floor(Math.random() * 200) + 50, // Random stock 50-250
            category: categoryDocs[therapy],
            manufacturer: row.manufacturer_name,
            composition: composition.trim(),
            packSize: row.pack_size_label,
            images: [getImage(row.pack_size_label)],
            sku: `MED-${row.id}`,
          });

          medicineCount++;
        })
        .on("end", async () => {
          console.log(`📊 Parsed ${medicineCount} medicines from CSV`);

          if (medicines.length === 0) {
            console.error("❌ No medicines parsed from CSV");
            await mongoose.connection.close();
            reject(new Error("No medicines to insert"));
            return;
          }

          try {
            // Clear existing products
            await Product.deleteMany({});
            console.log("🗑️  Cleared existing products");

            // Insert medicines in batches
            const batchSize = 1000;
            let inserted = 0;

            for (let i = 0; i < medicines.length; i += batchSize) {
              const batch = medicines.slice(i, i + batchSize);
              await Product.insertMany(batch, { ordered: false });
              inserted += batch.length;
              console.log(
                `✅ Inserted ${inserted}/${medicines.length} medicines`,
              );
            }

            console.log(
              `\n✨ Database seeding complete!\n📦 Total medicines: ${inserted}`,
            );

            // Statistics
            const stats = await Product.aggregate([
              { $group: { _id: "$category", count: { $sum: 1 } } },
              {
                $lookup: {
                  from: "categories",
                  localField: "_id",
                  foreignField: "_id",
                  as: "categoryInfo",
                },
              },
              {
                $project: {
                  categoryName: { $arrayElemAt: ["$categoryInfo.name", 0] },
                  count: 1,
                },
              },
            ]);

            console.log("\n📈 Medicines by Category:");
            stats.forEach((stat) => {
              console.log(`  ${stat.categoryName}: ${stat.count} medicines`);
            });

            // Close connection
            await mongoose.connection.close();
            console.log("\n✅ Database connection closed");
            resolve();
          } catch (error) {
            // Close connection before rejecting
            try {
              await mongoose.connection.close();
            } catch (e) {
              // ignore
            }
            reject(error);
          }
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  } catch (error) {
    console.error("❌ Seeding error:", error);
    try {
      await mongoose.connection.close();
    } catch (e) {
      // ignore
    }
    throw error;
  }
}

// Run seeder
seedMedicines()
  .then(() => {
    console.log("\n🎉 Seeding finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
