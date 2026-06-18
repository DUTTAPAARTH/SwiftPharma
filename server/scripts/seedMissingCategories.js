import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Product from "../src/models/Product.js";
import Category from "../src/models/Category.js";

dotenv.config();

const PACK_SIZES = [10, 15, 20, 30, 60];

const productTemplates = [
  // ── Skin & Personal Care ──────────────────────────────────────────────────
  { name: "Cetaphil Moisturizing Cream", brand: "Cetaphil", composition: "Petrolatum, Glycerin", categorySlug: "skin-personal-care", basePrice: 320, strengths: [{ label: "50g", factor: 1 }, { label: "250g", factor: 2.8 }, { label: "500g", factor: 4.5 }], forms: [{ label: "Cream", factor: 1 }, { label: "Lotion", factor: 1.1 }], prescriptionRequired: false },
  { name: "Clotrimazole", brand: "Candid", composition: "Clotrimazole 1%", categorySlug: "skin-personal-care", basePrice: 85, strengths: [{ label: "1%", factor: 1 }], forms: [{ label: "Cream", factor: 1 }, { label: "Dusting Powder", factor: 0.9 }, { label: "Solution", factor: 1.1 }], prescriptionRequired: false },
  { name: "Betamethasone Cream", brand: "Betnovate", composition: "Betamethasone Valerate 0.1%", categorySlug: "skin-personal-care", basePrice: 95, strengths: [{ label: "0.025%", factor: 0.9 }, { label: "0.1%", factor: 1 }], forms: [{ label: "Cream", factor: 1 }, { label: "Ointment", factor: 1 }, { label: "Lotion", factor: 1.05 }], prescriptionRequired: true },
  { name: "Sunscreen SPF 50", brand: "Lotus Herbals", composition: "Titanium Dioxide, Zinc Oxide", categorySlug: "skin-personal-care", basePrice: 280, strengths: [{ label: "SPF 30", factor: 0.85 }, { label: "SPF 50", factor: 1 }, { label: "SPF 70", factor: 1.2 }], forms: [{ label: "Lotion", factor: 1 }, { label: "Gel", factor: 1.05 }, { label: "Spray", factor: 1.15 }], prescriptionRequired: false },
  { name: "Mupirocin", brand: "Bactroban", composition: "Mupirocin 2%", categorySlug: "skin-personal-care", basePrice: 110, strengths: [{ label: "2%", factor: 1 }], forms: [{ label: "Ointment", factor: 1 }, { label: "Cream", factor: 1.05 }], prescriptionRequired: true },
  { name: "Calamine Lotion", brand: "Lacto Calamine", composition: "Calamine, Zinc Oxide", categorySlug: "skin-personal-care", basePrice: 75, strengths: [{ label: "60ml", factor: 1 }, { label: "120ml", factor: 1.6 }], forms: [{ label: "Lotion", factor: 1 }], prescriptionRequired: false },
  { name: "Kojic Acid Cream", brand: "Kojivit", composition: "Kojic Acid 2%", categorySlug: "skin-personal-care", basePrice: 190, strengths: [{ label: "15g", factor: 1 }, { label: "30g", factor: 1.7 }], forms: [{ label: "Cream", factor: 1 }, { label: "Gel", factor: 1.05 }], prescriptionRequired: false },
  { name: "Hydroquinone Cream", brand: "Melacare", composition: "Hydroquinone 2%, Tretinoin 0.025%", categorySlug: "skin-personal-care", basePrice: 145, strengths: [{ label: "2%", factor: 1 }, { label: "4%", factor: 1.3 }], forms: [{ label: "Cream", factor: 1 }], prescriptionRequired: true },
  { name: "Ketoconazole Shampoo", brand: "Nizoral", composition: "Ketoconazole 2%", categorySlug: "skin-personal-care", basePrice: 160, strengths: [{ label: "1%", factor: 0.9 }, { label: "2%", factor: 1 }], forms: [{ label: "Shampoo", factor: 1 }, { label: "Lotion", factor: 1.1 }], prescriptionRequired: false },
  { name: "Tretinoin Cream", brand: "A-Ret", composition: "Tretinoin 0.025%", categorySlug: "skin-personal-care", basePrice: 175, strengths: [{ label: "0.025%", factor: 1 }, { label: "0.05%", factor: 1.2 }, { label: "0.1%", factor: 1.4 }], forms: [{ label: "Cream", factor: 1 }, { label: "Gel", factor: 1.05 }], prescriptionRequired: true },
  { name: "Salicylic Acid", brand: "Saslic", composition: "Salicylic Acid 2%", categorySlug: "skin-personal-care", basePrice: 95, strengths: [{ label: "1%", factor: 0.9 }, { label: "2%", factor: 1 }, { label: "6%", factor: 1.3 }], forms: [{ label: "Gel", factor: 1 }, { label: "Face Wash", factor: 1.1 }, { label: "Lotion", factor: 1.05 }], prescriptionRequired: false },
  { name: "Azelaic Acid", brand: "Aziderm", composition: "Azelaic Acid 10%", categorySlug: "skin-personal-care", basePrice: 220, strengths: [{ label: "10%", factor: 1 }, { label: "15%", factor: 1.2 }, { label: "20%", factor: 1.4 }], forms: [{ label: "Cream", factor: 1 }, { label: "Gel", factor: 1.05 }], prescriptionRequired: false },
  { name: "Niacinamide Serum", brand: "Minimalist", composition: "Niacinamide 10%, Zinc 1%", categorySlug: "skin-personal-care", basePrice: 399, strengths: [{ label: "5%", factor: 0.8 }, { label: "10%", factor: 1 }], forms: [{ label: "Serum", factor: 1 }], prescriptionRequired: false },
  { name: "Hyaluronic Acid Serum", brand: "Dot & Key", composition: "Hyaluronic Acid 2%, B5", categorySlug: "skin-personal-care", basePrice: 450, strengths: [{ label: "1%", factor: 0.85 }, { label: "2%", factor: 1 }], forms: [{ label: "Serum", factor: 1 }, { label: "Gel", factor: 0.95 }], prescriptionRequired: false },
  { name: "Silver Sulfadiazine", brand: "Silverex", composition: "Silver Sulfadiazine 1%", categorySlug: "skin-personal-care", basePrice: 130, strengths: [{ label: "1%", factor: 1 }], forms: [{ label: "Cream", factor: 1 }], prescriptionRequired: true },
  { name: "Urea Cream", brand: "Nutraquin", composition: "Urea 10%", categorySlug: "skin-personal-care", basePrice: 155, strengths: [{ label: "10%", factor: 1 }, { label: "20%", factor: 1.3 }, { label: "40%", factor: 1.7 }], forms: [{ label: "Cream", factor: 1 }, { label: "Lotion", factor: 1.05 }], prescriptionRequired: false },
  { name: "Tacrolimus Ointment", brand: "Protopic", composition: "Tacrolimus 0.03%", categorySlug: "skin-personal-care", basePrice: 480, strengths: [{ label: "0.03%", factor: 1 }, { label: "0.1%", factor: 1.3 }], forms: [{ label: "Ointment", factor: 1 }], prescriptionRequired: true },
  { name: "Zinc Oxide Paste", brand: "Zincovit", composition: "Zinc Oxide 25%", categorySlug: "skin-personal-care", basePrice: 65, strengths: [{ label: "25%", factor: 1 }], forms: [{ label: "Paste", factor: 1 }, { label: "Ointment", factor: 1 }], prescriptionRequired: false },

  // ── Baby & Mother Care ────────────────────────────────────────────────────
  { name: "Gripe Water", brand: "Woodward's", composition: "Dill Seed Oil, Sodium Bicarbonate", categorySlug: "baby-mother-care", basePrice: 65, strengths: [{ label: "100ml", factor: 1 }, { label: "200ml", factor: 1.7 }], forms: [{ label: "Syrup", factor: 1 }], prescriptionRequired: false },
  { name: "Baby Diaper Rash Cream", brand: "Sebamed", composition: "Zinc Oxide 10%, Panthenol", categorySlug: "baby-mother-care", basePrice: 195, strengths: [{ label: "50g", factor: 1 }, { label: "100g", factor: 1.7 }], forms: [{ label: "Cream", factor: 1 }, { label: "Ointment", factor: 1.05 }], prescriptionRequired: false },
  { name: "Paediatric Paracetamol Drops", brand: "Calpol", composition: "Paracetamol 100mg/ml", categorySlug: "baby-mother-care", basePrice: 55, strengths: [{ label: "60mg/5ml", factor: 0.9 }, { label: "100mg/ml", factor: 1 }], forms: [{ label: "Drops", factor: 1 }, { label: "Syrup", factor: 1.05 }, { label: "Suspension", factor: 1.1 }], prescriptionRequired: false },
  { name: "Iron + Folic Acid Prenatal", brand: "Pregnacare", composition: "Ferrous Fumarate 300mg, Folic Acid 400mcg", categorySlug: "baby-mother-care", basePrice: 210, strengths: [{ label: "30 tabs", factor: 1 }, { label: "60 tabs", factor: 1.8 }, { label: "90 tabs", factor: 2.4 }], forms: [{ label: "Tablet", factor: 1 }, { label: "Capsule", factor: 1.05 }], prescriptionRequired: false },
  { name: "Lactation Supplement", brand: "Fenugreek Plus", composition: "Fenugreek 500mg, Fennel 200mg", categorySlug: "baby-mother-care", basePrice: 320, strengths: [{ label: "30 caps", factor: 1 }, { label: "60 caps", factor: 1.8 }], forms: [{ label: "Capsule", factor: 1 }, { label: "Tablet", factor: 0.95 }], prescriptionRequired: false },
  { name: "Baby Probiotic Drops", brand: "BioGaia", composition: "Lactobacillus reuteri DSM 17938", categorySlug: "baby-mother-care", basePrice: 650, strengths: [{ label: "5ml", factor: 1 }, { label: "10ml", factor: 1.7 }], forms: [{ label: "Drops", factor: 1 }], prescriptionRequired: false },
  { name: "Vitamin D3 Drops Infant", brand: "D3 Must", composition: "Cholecalciferol 400 IU", categorySlug: "baby-mother-care", basePrice: 190, strengths: [{ label: "400 IU", factor: 1 }, { label: "800 IU", factor: 1.3 }, { label: "1000 IU", factor: 1.5 }], forms: [{ label: "Drops", factor: 1 }, { label: "Oral Solution", factor: 1.05 }], prescriptionRequired: false },
  { name: "Baby Colic Drops", brand: "Simethicone", composition: "Simethicone 40mg/0.6ml", categorySlug: "baby-mother-care", basePrice: 85, strengths: [{ label: "40mg/0.6ml", factor: 1 }], forms: [{ label: "Drops", factor: 1 }, { label: "Suspension", factor: 1.05 }], prescriptionRequired: false },
  { name: "ORS Sachets", brand: "Electral", composition: "Sodium Chloride, Potassium Chloride, Glucose", categorySlug: "baby-mother-care", basePrice: 12, strengths: [{ label: "4.4g", factor: 1 }, { label: "21g", factor: 3 }], forms: [{ label: "Powder", factor: 1 }], prescriptionRequired: false },
  { name: "Omega 3 Prenatal", brand: "Healthvit", composition: "DHA 200mg, EPA 100mg", categorySlug: "baby-mother-care", basePrice: 380, strengths: [{ label: "30 caps", factor: 1 }, { label: "60 caps", factor: 1.75 }], forms: [{ label: "Capsule", factor: 1 }, { label: "Softgel", factor: 1.05 }], prescriptionRequired: false },
  { name: "Baby Zinc Syrup", brand: "Zincovit", composition: "Zinc Sulphate 20mg/5ml", categorySlug: "baby-mother-care", basePrice: 75, strengths: [{ label: "10mg/5ml", factor: 0.9 }, { label: "20mg/5ml", factor: 1 }], forms: [{ label: "Syrup", factor: 1 }, { label: "Drops", factor: 1.05 }], prescriptionRequired: false },
  { name: "Calcium + D3 Prenatal", brand: "Shelcal", composition: "Calcium Carbonate 500mg, Vitamin D3 250 IU", categorySlug: "baby-mother-care", basePrice: 155, strengths: [{ label: "250mg", factor: 0.9 }, { label: "500mg", factor: 1 }, { label: "1000mg", factor: 1.5 }], forms: [{ label: "Tablet", factor: 1 }, { label: "Chewable Tablet", factor: 1.1 }], prescriptionRequired: false },
  { name: "Baby Teething Gel", brand: "Dentinox", composition: "Lidocaine HCl 0.33%, Cetylpyridinium", categorySlug: "baby-mother-care", basePrice: 95, strengths: [{ label: "10g", factor: 1 }], forms: [{ label: "Gel", factor: 1 }], prescriptionRequired: false },
  { name: "Nappy Rash Barrier Cream", brand: "Drapolene", composition: "Benzalkonium Chloride, Cetrimide", categorySlug: "baby-mother-care", basePrice: 145, strengths: [{ label: "55g", factor: 1 }, { label: "100g", factor: 1.6 }], forms: [{ label: "Cream", factor: 1 }], prescriptionRequired: false },
  { name: "Postnatal Vitamin Complex", brand: "Materna", composition: "Multivitamin + Multimineral", categorySlug: "baby-mother-care", basePrice: 420, strengths: [{ label: "30 tabs", factor: 1 }, { label: "60 tabs", factor: 1.8 }], forms: [{ label: "Tablet", factor: 1 }, { label: "Capsule", factor: 1.05 }], prescriptionRequired: false },
  { name: "Paediatric Ibuprofen", brand: "Brufen", composition: "Ibuprofen 100mg/5ml", categorySlug: "baby-mother-care", basePrice: 60, strengths: [{ label: "100mg/5ml", factor: 1 }], forms: [{ label: "Suspension", factor: 1 }, { label: "Drops", factor: 1.1 }], prescriptionRequired: false },
  { name: "Baby Nasal Drops", brand: "Nasivion", composition: "Oxymetazoline 0.01%", categorySlug: "baby-mother-care", basePrice: 55, strengths: [{ label: "0.01%", factor: 1 }, { label: "0.025%", factor: 1.1 }], forms: [{ label: "Nasal Drops", factor: 1 }], prescriptionRequired: false },

  // ── Medical Devices ───────────────────────────────────────────────────────
  { name: "Digital Thermometer", brand: "Omron", composition: "Electronic Thermometer", categorySlug: "medical-devices", basePrice: 180, strengths: [{ label: "Standard", factor: 1 }, { label: "Flexible Tip", factor: 1.3 }, { label: "Waterproof", factor: 1.5 }], forms: [{ label: "Oral", factor: 1 }, { label: "Axillary", factor: 0.95 }, { label: "Rectal", factor: 1.1 }], prescriptionRequired: false },
  { name: "Blood Pressure Monitor", brand: "Omron", composition: "Automatic Sphygmomanometer", categorySlug: "medical-devices", basePrice: 1499, strengths: [{ label: "Standard", factor: 1 }, { label: "Large Cuff", factor: 1.15 }], forms: [{ label: "Upper Arm", factor: 1 }, { label: "Wrist", factor: 0.85 }, { label: "Professional", factor: 1.5 }], prescriptionRequired: false },
  { name: "Pulse Oximeter", brand: "Dr. Trust", composition: "Fingertip SpO2 Monitor", categorySlug: "medical-devices", basePrice: 849, strengths: [{ label: "Standard", factor: 1 }, { label: "Pediatric", factor: 1.1 }], forms: [{ label: "Fingertip", factor: 1 }, { label: "Handheld", factor: 1.8 }], prescriptionRequired: false },
  { name: "Glucometer", brand: "Accu-Chek", composition: "Blood Glucose Meter", categorySlug: "medical-devices", basePrice: 649, strengths: [{ label: "Standard", factor: 1 }], forms: [{ label: "Active", factor: 1 }, { label: "Instant", factor: 1.5 }, { label: "Guide", factor: 1.8 }, { label: "Mobile", factor: 2.1 }], prescriptionRequired: false },
  { name: "Glucometer Test Strips", brand: "Accu-Chek", composition: "Glucose Oxidase Biosensor", categorySlug: "medical-devices", basePrice: 599, strengths: [{ label: "25 strips", factor: 1 }, { label: "50 strips", factor: 1.8 }, { label: "100 strips", factor: 3.2 }], forms: [{ label: "Active Strips", factor: 1 }, { label: "Instant Strips", factor: 1.05 }, { label: "Guide Strips", factor: 1.1 }], prescriptionRequired: false },
  { name: "Nebulizer", brand: "Omron", composition: "Compressor Nebulizer", categorySlug: "medical-devices", basePrice: 2199, strengths: [{ label: "Standard", factor: 1 }], forms: [{ label: "Tabletop", factor: 1 }, { label: "Portable Mesh", factor: 1.6 }, { label: "Ultrasonic", factor: 2 }], prescriptionRequired: false },
  { name: "Nebulizer Mask", brand: "Romsons", composition: "Adult / Child Nebulizer Mask", categorySlug: "medical-devices", basePrice: 120, strengths: [{ label: "Adult", factor: 1 }, { label: "Child", factor: 0.9 }, { label: "Infant", factor: 0.85 }], forms: [{ label: "Mask", factor: 1 }], prescriptionRequired: false },
  { name: "Surgical Gloves", brand: "Ansell", composition: "Latex Surgical Gloves", categorySlug: "medical-devices", basePrice: 120, strengths: [{ label: "Small (S)", factor: 1 }, { label: "Medium (M)", factor: 1 }, { label: "Large (L)", factor: 1 }, { label: "XL", factor: 1 }], forms: [{ label: "Latex", factor: 1 }, { label: "Nitrile", factor: 1.2 }, { label: "Vinyl", factor: 0.9 }], prescriptionRequired: false },
  { name: "Crepe Bandage", brand: "Dyna", composition: "Cotton Crepe Bandage", categorySlug: "medical-devices", basePrice: 45, strengths: [{ label: "2 inch", factor: 0.8 }, { label: "4 inch", factor: 1 }, { label: "6 inch", factor: 1.3 }, { label: "8 inch", factor: 1.6 }], forms: [{ label: "Standard", factor: 1 }, { label: "Heavy", factor: 1.2 }], prescriptionRequired: false },
  { name: "Digital Weighing Scale", brand: "Dr. Morepen", composition: "Electronic Body Weight Scale", categorySlug: "medical-devices", basePrice: 999, strengths: [{ label: "150kg", factor: 1 }, { label: "200kg", factor: 1.3 }], forms: [{ label: "Standard", factor: 1 }, { label: "BMI Analyser", factor: 1.5 }, { label: "Smart (Bluetooth)", factor: 2 }], prescriptionRequired: false },
  { name: "Insulin Syringe", brand: "BD", composition: "Insulin Syringe with Needle", categorySlug: "medical-devices", basePrice: 95, strengths: [{ label: "0.3ml 30G", factor: 0.9 }, { label: "0.5ml 29G", factor: 1 }, { label: "1ml 28G", factor: 1.1 }], forms: [{ label: "10 pcs", factor: 1 }, { label: "100 pcs", factor: 8 }], prescriptionRequired: false },
  { name: "Peak Flow Meter", brand: "Clement Clarke", composition: "Portable Peak Flow Meter", categorySlug: "medical-devices", basePrice: 750, strengths: [{ label: "Standard Range", factor: 1 }, { label: "Low Range (Paed)", factor: 0.9 }], forms: [{ label: "Standard", factor: 1 }], prescriptionRequired: false },
  { name: "Lancets", brand: "BD", composition: "Sterile Blood Lancet", categorySlug: "medical-devices", basePrice: 150, strengths: [{ label: "28G", factor: 1 }, { label: "30G", factor: 1 }, { label: "33G", factor: 1.05 }], forms: [{ label: "100 pcs", factor: 1 }, { label: "200 pcs", factor: 1.85 }], prescriptionRequired: false },
  { name: "Stethoscope", brand: "Littmann", composition: "Acoustic Stethoscope", categorySlug: "medical-devices", basePrice: 1800, strengths: [{ label: "Standard", factor: 1 }], forms: [{ label: "Classic", factor: 1 }, { label: "Cardiology", factor: 2.8 }, { label: "Paediatric", factor: 1.4 }], prescriptionRequired: false },
  { name: "Wheelchair", brand: "Karma", composition: "Foldable Wheelchair", categorySlug: "medical-devices", basePrice: 6500, strengths: [{ label: "Standard", factor: 1 }], forms: [{ label: "Manual", factor: 1 }, { label: "Lightweight", factor: 1.6 }, { label: "Electric", factor: 6 }], prescriptionRequired: false },
  { name: "Orthopaedic Knee Support", brand: "Tynor", composition: "Neoprene Knee Brace", categorySlug: "medical-devices", basePrice: 350, strengths: [{ label: "Small", factor: 1 }, { label: "Medium", factor: 1 }, { label: "Large", factor: 1 }, { label: "XL", factor: 1 }], forms: [{ label: "Soft", factor: 1 }, { label: "Hinged", factor: 1.8 }], prescriptionRequired: false },
  { name: "Cervical Collar", brand: "Tynor", composition: "Polyethylene Foam Collar", categorySlug: "medical-devices", basePrice: 280, strengths: [{ label: "Small", factor: 1 }, { label: "Medium", factor: 1 }, { label: "Large", factor: 1.05 }], forms: [{ label: "Soft", factor: 1 }, { label: "Hard", factor: 1.4 }], prescriptionRequired: false },
  { name: "TENS Machine", brand: "Beurer", composition: "Transcutaneous Electrical Nerve Stimulator", categorySlug: "medical-devices", basePrice: 3200, strengths: [{ label: "2 Channel", factor: 1 }, { label: "4 Channel", factor: 1.6 }], forms: [{ label: "Portable", factor: 1 }, { label: "Professional", factor: 2.5 }], prescriptionRequired: false },
];

const seedMissingCategories = async () => {
  await connectDB();

  const categoryMap = {};
  const cats = await Category.find({});
  for (const c of cats) categoryMap[c.slug] = c._id;

  // Remove old incomplete entries for these 3 categories
  const targetSlugs = ["skin-personal-care", "baby-mother-care", "medical-devices"];
  const targetCatIds = targetSlugs.map((s) => categoryMap[s]).filter(Boolean);
  const deleted = await Product.deleteMany({ category: { $in: targetCatIds } });
  console.log(`🗑  Cleared ${deleted.deletedCount} old products from target categories`);

  let inserted = 0;
  for (const tmpl of productTemplates) {
    const catId = categoryMap[tmpl.categorySlug];
    if (!catId) { console.warn(`Category not found: ${tmpl.categorySlug}`); continue; }

    for (const form of tmpl.forms) {
      for (const strength of tmpl.strengths) {
        for (const packSize of PACK_SIZES) {
          // Skip pack sizes for non-tablet/capsule items that use size labels already
          const usePack = ["Tablet", "Capsule", "Strips"].includes(form.label);
          const packLabel = usePack ? `, Pack of ${packSize}` : "";
          if (!usePack && packSize !== PACK_SIZES[0]) continue;

          const name = `${tmpl.name} (${strength.label}, ${form.label}${packLabel})`;
          const exists = await Product.findOne({ name });
          if (exists) continue;

          const packFactor = usePack ? (packSize / 10) * 0.85 : 1;

          await Product.create({
            name,
            brand: tmpl.brand,
            composition: tmpl.composition,
            strength: strength.label,
            form: form.label,
            category: catId,
            price: Math.round(tmpl.basePrice * strength.factor * form.factor * packFactor * 10) / 10,
            mrp: 0,
            stock: Math.floor(Math.random() * 200) + 50,
            prescriptionRequired: tmpl.prescriptionRequired,
            isRx: tmpl.prescriptionRequired,
            isActive: true,
          });
          inserted++;
        }
      }
    }
  }

  console.log(`✅ Inserted ${inserted} products across skin, baby, and medical-devices categories`);
  await mongoose.disconnect();
};

seedMissingCategories().catch((e) => { console.error(e); process.exit(1); });
