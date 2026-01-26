import dotenv from "dotenv";
import connectDB from "../src/config/db.js";
import Category from "../src/models/Category.js";

dotenv.config();

const categories = [
  {
    name: "Fever & Pain Relief",
    slug: "fever-pain-relief",
    description: "Relief for fever, headache, body pain, and inflammation.",
    icon: "🌡️",
    tags: ["OTC", "Popular"],
    type: "OTC",
  },
  {
    name: "Diabetes Care",
    slug: "diabetes-care",
    description: "Blood glucose control and diabetes management essentials.",
    icon: "🩸",
    tags: ["Rx", "New"],
    type: "Rx",
  },
  {
    name: "Heart Health",
    slug: "heart-health",
    description: "Cardiac wellness and blood pressure support.",
    icon: "❤️",
    tags: ["Rx"],
    type: "Rx",
  },
  {
    name: "Respiratory & Allergy",
    slug: "respiratory-allergy",
    description: "Airway relief, inhalers, and anti-allergy essentials.",
    icon: "🫁",
    tags: ["OTC", "Rx"],
    type: "Rx",
  },
  {
    name: "Gut Health",
    slug: "gut-health",
    description: "Acidity relief, digestion, gut motility, and rehydration.",
    icon: "🥗",
    tags: ["OTC"],
    type: "OTC",
  },
  {
    name: "Vitamins & Immunity",
    slug: "vitamins-immunity",
    description: "Daily nutrition, immunity boosters, and supplements.",
    icon: "💊",
    tags: ["Wellness", "Popular"],
    type: "Wellness",
  },
  {
    name: "Skin & Personal Care",
    slug: "skin-personal-care",
    description: "Dermatology Rx, sunscreen, serums, grooming essentials.",
    icon: "🧴",
    tags: ["Personal", "New"],
    type: "Personal",
  },
  {
    name: "Baby & Mother Care",
    slug: "baby-mother-care",
    description: "Infant nutrition, diapers, lactation support, gentle care.",
    icon: "👶",
    tags: ["Personal", "Popular"],
    type: "Personal",
  },
  {
    name: "Medical Devices",
    slug: "medical-devices",
    description: "BP monitors, nebulizers, oximeters, thermometers.",
    icon: "📟",
    tags: ["OTC"],
    type: "OTC",
  },
];

const seedCategories = async () => {
  try {
    await connectDB();
    console.log("🔄 Clearing existing categories...");
    await Category.deleteMany({});

    console.log("📦 Seeding categories...");
    const createdCategories = await Category.insertMany(categories);

    console.log(
      `✅ Successfully seeded ${createdCategories.length} categories`,
    );
    createdCategories.forEach((cat) => {
      console.log(`   - ${cat.name} (${cat.slug})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding categories:", error);
    process.exit(1);
  }
};

seedCategories();
