import fs from "fs";
import path from "path";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import Prescription from "../models/Prescription.js";
import { uploadBufferToCloudinary } from "../services/uploadService.js";
import { parsePrescriptionOCR } from "../services/prescriptionParser.js";
import { filterMedicineLines } from "../services/lineFilter.js";

const uploadsDir = path.resolve(process.cwd(), "uploads", "prescriptions");
const ensureUploadsDir = async () => {
  await fs.promises.mkdir(uploadsDir, { recursive: true });
};

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const preprocessImage = async (filePath, idx) => {
  const processedPath = path.join(
    uploadsDir,
    `processed-${idx}-${path.basename(filePath, path.extname(filePath))}.png`,
  );

  console.log("[PREPROCESS] Starting for file:", filePath);

  try {
    // Simple but effective preprocessing for OCR
    await sharp(filePath)
      .rotate() // Auto-rotate based on EXIF
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.5 })
      .toFormat("png")
      .toFile(processedPath);

    console.log("[PREPROCESS] Saved to:", processedPath);
    const buffer = await fs.promises.readFile(processedPath);
    return { processedPath, buffer };
  } catch (error) {
    console.error("[PREPROCESS] Error:", error.message);
    throw error;
  }
};

const runOcr = async (filePath) => {
  try {
    console.log("[OCR] Processing file:", filePath);

    // Set a 60 second timeout for OCR
    const ocrPromise = Tesseract.recognize(filePath, "eng", {
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 mgmcgmLmlodBdTdsoncetwicethriceadailyqtyQTY/.-:,;()- ",
      logger: (m) => {
        if (m.status === "recognizing text" && m.progress) {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OCR timeout")), 120000),
    );

    const result = await Promise.race([ocrPromise, timeoutPromise]);
    const text = result?.data?.text || "";
    console.log("[OCR] SUCCESS - Extracted text length:", text.length);
    console.log("[OCR] Raw text:", text);
    return text;
  } catch (err) {
    console.error("[OCR] FAILED:", err.message);
    return "";
  }
};

const parseDoctorName = (ocrText, provided) => {
  if (provided) return provided;
  const doctorMatch = ocrText.match(/Dr\.?\s+[A-Z][A-Za-z.\s]+/);
  return doctorMatch ? doctorMatch[0].trim() : undefined;
};

const parseIssueDate = (ocrText, provided) => {
  if (provided) return new Date(provided);
  const dateMatch = ocrText.match(
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\-]\d{2}[\-]\d{2})/,
  );
  return dateMatch ? new Date(dateMatch[0]) : undefined;
};

// Medicine knowledge base and normalization maps
const MEDICINE_DATABASE = {
  // Common abbreviations and their full names
  abbreviations: {
    PCM: "Paracetamol",
    DXM: "Dextromethorphan",
    ORS: "Oral Rehydration Solution",
  },
  // Known medicines with aliases
  medicines: [
    // --- Auto-generated from all product data files ---
    // Fever
    {
      name: "Paracetamol",
      aliases: ["PCM", "Acetaminophen"],
      category: "Fever/Pain Relief",
    },
    { name: "Ibuprofen", aliases: ["IBU"], category: "Fever/Pain Relief" },
    {
      name: "Diclofenac",
      aliases: ["Voltaren"],
      category: "Fever/Pain Relief",
    },
    { name: "Aceclofenac", aliases: [], category: "Fever/Pain Relief" },
    { name: "Aspirin", aliases: [], category: "Fever/Pain Relief" },
    { name: "Naproxen", aliases: [], category: "Fever/Pain Relief" },
    { name: "Thiocolchicoside", aliases: [], category: "Fever/Pain Relief" },
    { name: "Chlorzoxazone", aliases: [], category: "Fever/Pain Relief" },
    { name: "Flupirtine", aliases: [], category: "Fever/Pain Relief" },
    { name: "Carisoprodol", aliases: [], category: "Fever/Pain Relief" },
    { name: "Metaxalone", aliases: [], category: "Fever/Pain Relief" },
    { name: "Baclofen", aliases: [], category: "Fever/Pain Relief" },
    { name: "Ketoprofen", aliases: [], category: "Fever/Pain Relief" },
    { name: "Camphor", aliases: [], category: "Fever/Pain Relief" },
    { name: "Menthol", aliases: [], category: "Fever/Pain Relief" },
    { name: "Eucalyptus", aliases: [], category: "Fever/Pain Relief" },
    { name: "Methyl Salicylate", aliases: [], category: "Fever/Pain Relief" },
    { name: "Capsicum Extract", aliases: [], category: "Fever/Pain Relief" },
    { name: "Celecoxib", aliases: [], category: "Fever/Pain Relief" },
    { name: "Etoricoxib", aliases: [], category: "Fever/Pain Relief" },
    { name: "Meloxicam", aliases: [], category: "Fever/Pain Relief" },
    // Diabetes
    {
      name: "Metformin",
      aliases: ["Metformin HCl", "Glucophage"],
      category: "Diabetes",
    },
    {
      name: "Glibenclamide",
      aliases: ["Glyburide", "Daonil"],
      category: "Diabetes",
    },
    { name: "Gliclazide", aliases: ["Diamicron"], category: "Diabetes" },
    { name: "Glipizide", aliases: [], category: "Diabetes" },
    { name: "Glimepiride", aliases: ["Amaryl"], category: "Diabetes" },
    { name: "Sitagliptin", aliases: ["Januvia"], category: "Diabetes" },
    { name: "Vildagliptin", aliases: ["Galvus"], category: "Diabetes" },
    { name: "Saxagliptin", aliases: ["Onglyza"], category: "Diabetes" },
    { name: "Linagliptin", aliases: ["Tradjenta"], category: "Diabetes" },
    { name: "Exenatide", aliases: [], category: "Diabetes" },
    { name: "Dulaglutide", aliases: [], category: "Diabetes" },
    { name: "Liraglutide", aliases: [], category: "Diabetes" },
    { name: "Semaglutide", aliases: [], category: "Diabetes" },
    { name: "Tirzepatide", aliases: [], category: "Diabetes" },
    { name: "Insulin Human", aliases: ["Humulin N"], category: "Diabetes" },
    { name: "Insulin Glargine", aliases: ["Lantus"], category: "Diabetes" },
    { name: "Insulin Lispro", aliases: ["Humalog"], category: "Diabetes" },
    { name: "Insulin Aspart", aliases: ["NovoLog"], category: "Diabetes" },
    { name: "Insulin Detemir", aliases: ["Levemir"], category: "Diabetes" },
    { name: "Empagliflozin", aliases: ["Jardiance"], category: "Diabetes" },
    { name: "Dapagliflozin", aliases: ["Farxiga"], category: "Diabetes" },
    { name: "Canagliflozin", aliases: ["Invokana"], category: "Diabetes" },
    { name: "Ertugliflozin", aliases: ["Steglatro"], category: "Diabetes" },
    { name: "Ipragliflozin", aliases: [], category: "Diabetes" },
    { name: "Tofogliflozin", aliases: [], category: "Diabetes" },
    { name: "Teneligliptin", aliases: [], category: "Diabetes" },
    { name: "Pioglitazone", aliases: [], category: "Diabetes" },
    { name: "Repaglinide", aliases: [], category: "Diabetes" },
    // Heart Health
    { name: "Atorvastatin", aliases: ["Lipitor"], category: "Heart Health" },
    { name: "Rosuvastatin", aliases: ["Crestor"], category: "Heart Health" },
    { name: "Simvastatin", aliases: [], category: "Heart Health" },
    { name: "Lovastatin", aliases: [], category: "Heart Health" },
    { name: "Pravastatin", aliases: [], category: "Heart Health" },
    { name: "Pitavastatin", aliases: [], category: "Heart Health" },
    { name: "Enalapril", aliases: [], category: "Heart Health" },
    { name: "Lisinopril", aliases: [], category: "Heart Health" },
    { name: "Ramipril", aliases: [], category: "Heart Health" },
    { name: "Perindopril", aliases: [], category: "Heart Health" },
    { name: "Captopril", aliases: [], category: "Heart Health" },
    // Wellness
    {
      name: "Multivitamin",
      aliases: ["Multi-Vitamin Complex"],
      category: "Wellness",
    },
    { name: "Vitamin C", aliases: ["Ascorbic Acid"], category: "Wellness" },
    { name: "Vitamin D3", aliases: ["Cholecalciferol"], category: "Wellness" },
    {
      name: "Vitamin B Complex",
      aliases: ["B Vitamins"],
      category: "Wellness",
    },
    { name: "Vitamin B12", aliases: ["Cyanocobalamin"], category: "Wellness" },
    { name: "Folic Acid", aliases: [], category: "Wellness" },
    { name: "Calcium Carbonate", aliases: ["Calcium"], category: "Wellness" },
    { name: "Magnesium Oxide", aliases: ["Magnesium"], category: "Wellness" },
    { name: "Zinc", aliases: [], category: "Wellness" },
    { name: "Ferrous Sulfate", aliases: ["Iron"], category: "Wellness" },
    { name: "Whey Protein", aliases: [], category: "Wellness" },
    { name: "Casein", aliases: [], category: "Wellness" },
    { name: "Vegan Protein", aliases: [], category: "Wellness" },
    { name: "BCAA Complex", aliases: [], category: "Wellness" },
    { name: "Glutamine", aliases: [], category: "Wellness" },
    { name: "L-Carnitine", aliases: [], category: "Wellness" },
    { name: "Creatine", aliases: [], category: "Wellness" },
    { name: "Melatonin", aliases: [], category: "Wellness" },
    { name: "Valerian Root", aliases: [], category: "Wellness" },
    { name: "Ashwagandha", aliases: [], category: "Wellness" },
    { name: "Ginseng", aliases: ["Korean Ginseng"], category: "Wellness" },
    { name: "Cordyceps", aliases: [], category: "Wellness" },
    { name: "Echinacea", aliases: [], category: "Wellness" },
    { name: "Tulsi", aliases: ["Holy Basil"], category: "Wellness" },
    { name: "Garlic", aliases: [], category: "Wellness" },
    {
      name: "Probiotics",
      aliases: ["Beneficial Bacteria"],
      category: "Wellness",
    },
    { name: "Curcumin", aliases: ["Turmeric"], category: "Wellness" },
    { name: "Ubiquinone", aliases: ["CoQ10"], category: "Wellness" },
    { name: "EPA+DHA", aliases: ["Omega-3 Fish Oil"], category: "Wellness" },
    { name: "ALA", aliases: ["Alpha Lipoic Acid"], category: "Wellness" },
    { name: "Inositol", aliases: [], category: "Wellness" },
    { name: "Berberine", aliases: [], category: "Wellness" },
    { name: "Selenium", aliases: [], category: "Wellness" },
    { name: "Biotin", aliases: [], category: "Wellness" },
    { name: "Rhodiola Rosea", aliases: ["Rhodiola"], category: "Wellness" },
    { name: "Maca", aliases: ["Maca Root"], category: "Wellness" },
    {
      name: "Hydrolyzed Collagen",
      aliases: ["Collagen"],
      category: "Wellness",
    },
    { name: "Hyaluronic Acid", aliases: [], category: "Wellness" },
    { name: "Glucosamine", aliases: [], category: "Wellness" },
    { name: "Methylsulfonylmethane", aliases: ["MSM"], category: "Wellness" },
    { name: "Spirulina", aliases: [], category: "Wellness" },
    { name: "Chlorella", aliases: [], category: "Wellness" },
    { name: "Milk Thistle", aliases: [], category: "Wellness" },
    { name: "Cilantro Extract", aliases: ["Cilantro"], category: "Wellness" },
    { name: "Resveratrol", aliases: [], category: "Wellness" },
    { name: "Ginkgo Biloba", aliases: [], category: "Wellness" },
    { name: "Brahmi", aliases: ["Bacopa Monnieri"], category: "Wellness" },
    { name: "L-Theanine", aliases: [], category: "Wellness" },
    { name: "5-Hydroxytryptophan", aliases: ["5-HTP"], category: "Wellness" },
    { name: "S-Adenosylmethionine", aliases: ["SAMe"], category: "Wellness" },
    { name: "Passiflora", aliases: ["Passion Flower"], category: "Wellness" },
    { name: "Chamomile", aliases: [], category: "Wellness" },
    { name: "Green Tea", aliases: [], category: "Wellness" },
    {
      name: "Nigella Sativa",
      aliases: ["Black Cumin Seed Oil"],
      category: "Wellness",
    },
    { name: "Saw Palmetto", aliases: [], category: "Wellness" },
    { name: "Dong Quai", aliases: [], category: "Wellness" },
    { name: "Evening Primrose Oil", aliases: ["EPO"], category: "Wellness" },
    { name: "Potassium Iodide", aliases: ["Iodine"], category: "Wellness" },
    {
      name: "Chromium Picolinate",
      aliases: ["Chromium"],
      category: "Wellness",
    },
    { name: "Vanadium", aliases: [], category: "Wellness" },
    { name: "Quercetin", aliases: [], category: "Wellness" },
    { name: "Lutein", aliases: [], category: "Wellness" },
    { name: "Lycopene", aliases: [], category: "Wellness" },
    { name: "Astaxanthin", aliases: [], category: "Wellness" },
    { name: "Zeaxanthin", aliases: [], category: "Wellness" },
    { name: "Taurine", aliases: [], category: "Wellness" },
    { name: "L-Carnitine Tartrate", aliases: [], category: "Wellness" },
    { name: "L-Arginine", aliases: [], category: "Wellness" },
    { name: "Citrulline", aliases: [], category: "Wellness" },
    { name: "Beta-Alanine", aliases: [], category: "Wellness" },
    {
      name: "Beta-Hydroxy Beta-Methylbutyrate",
      aliases: ["HMB"],
      category: "Wellness",
    },
    { name: "L-Carnitine Liquid", aliases: [], category: "Wellness" },
    {
      name: "Tribulus",
      aliases: ["Tribulus Terrestris"],
      category: "Wellness",
    },
    {
      name: "Eurycoma Longifolia",
      aliases: ["Tongkat Ali"],
      category: "Wellness",
    },
    { name: "Epimedium", aliases: ["Horny Goat Weed"], category: "Wellness" },
    { name: "Fulvic Acid", aliases: ["Shilajit"], category: "Wellness" },
    { name: "Tri-fruit Complex", aliases: ["Triphala"], category: "Wellness" },
    {
      name: "Withania Somnifera",
      aliases: ["Ashwagandha KSM-66"],
      category: "Wellness",
    },
    {
      name: "Asparagus Racemosus",
      aliases: ["Shatavari"],
      category: "Wellness",
    },
    { name: "Spice Complex", aliases: ["Bhaswara"], category: "Wellness" },
    {
      name: "Herbal Oil Blend",
      aliases: ["Abhyanga Massage Oil", "Neem Oil", "Brahmi Oil"],
      category: "Wellness",
    },
    {
      name: "Eclipta Alba",
      aliases: ["Bhringraj Hair Oil"],
      category: "Wellness",
    },
    {
      name: "Pure Coconut Oil",
      aliases: ["Coconut Oil Virgin Organic"],
      category: "Wellness",
    },
    // Skin Care
    { name: "Benzoyl Peroxide", aliases: [], category: "Skin Care" },
    { name: "Salicylic Acid", aliases: [], category: "Skin Care" },
    {
      name: "Mild Surfactants",
      aliases: ["Cetaphil Gentle Cleanser", "Vanicream Gentle Cleanser"],
      category: "Skin Care",
    },
    {
      name: "Moisturizer+SPF",
      aliases: ["Olay Total Effects Day Cream SPF 15"],
      category: "Skin Care",
    },
    {
      name: "Moisturizer",
      aliases: [
        "Olay Night Cream",
        "Lakme Absolute Skin Natural Cream",
        "Nivea Cream",
        "Generic Moisturizing Cream",
        "Cerave Moisturizing Lotion",
        "Eucerin Lotion",
        "Kiehl's Ultra Facial Cream",
        "La Roche Posay Toleriane",
      ],
      category: "Skin Care",
    },
    {
      name: "Sunscreen",
      aliases: [
        "Neutrogena Ultra Sheer SPF 30",
        "Coppertone Sport SPF 50",
        "Generic SPF 30 Sunscreen Cream",
        "SPF 50 Plus Sunscreen Lotion",
      ],
      category: "Skin Care",
    },
    { name: "Sunscreen Complex", aliases: [], category: "Skin Care" },
    { name: "Natural Oils", aliases: [], category: "Skin Care" },
    {
      name: "Ascorbic Acid",
      aliases: ["Vitamin C Serum 20%", "Vitamin C Brightening Serum"],
      category: "Skin Care",
    },
    {
      name: "Hyaluronic Acid",
      aliases: ["Hyaluronic Acid Serum", "Sheet Mask Hyaluronic Acid"],
      category: "Skin Care",
    },
    {
      name: "Retinol",
      aliases: ["Retinol 0.5% Night Serum", "Anti-Aging Retinol Cream"],
      category: "Skin Care",
    },
    {
      name: "Peptides",
      aliases: ["Peptide Complex Serum"],
      category: "Skin Care",
    },
    {
      name: "Kaolin Clay",
      aliases: ["Clay Face Mask Kaolin"],
      category: "Skin Care",
    },
    {
      name: "Green Tea Extract",
      aliases: ["Green Tea Antioxidant Mask"],
      category: "Skin Care",
    },
    {
      name: "Sunscreen+Balm",
      aliases: ["Lip Balm SPF 30"],
      category: "Skin Care",
    },
    {
      name: "Natural Extracts",
      aliases: ["Toner Alcohol Free"],
      category: "Skin Care",
    },
    {
      name: "Miconazole",
      aliases: ["Miconazole Nitrate Cream 2%"],
      category: "Skin Care",
    },
    {
      name: "Clotrimazole",
      aliases: ["Candid Dusting Powder", "Clotrimazole Cream 1%"],
      category: "Skin Care",
    },
    {
      name: "Kojic Acid",
      aliases: ["Kojic Acid Cream 2%"],
      category: "Skin Care",
    },
    {
      name: "Glycolic Acid",
      aliases: ["Glycolic Acid Exfoliant 10%"],
      category: "Skin Care",
    },
    {
      name: "Lactic Acid",
      aliases: ["Lactic Acid Toner 10%"],
      category: "Skin Care",
    },
    {
      name: "Niacinamide",
      aliases: ["Niacinamide 5% Face Serum"],
      category: "Skin Care",
    },
    {
      name: "Azelaic Acid",
      aliases: ["Azelaic Acid 10% Cream"],
      category: "Skin Care",
    },
    {
      name: "Sulfur",
      aliases: ["Sulfur Face Powder 5%"],
      category: "Skin Care",
    },
    {
      name: "Tretinoin",
      aliases: ["Tretinoin 0.025% Cream"],
      category: "Skin Care",
    },
    {
      name: "Adapalene",
      aliases: ["Adapalene 0.1% Gel"],
      category: "Skin Care",
    },
    {
      name: "Doxycycline",
      aliases: ["Doxycycline 50mg Capsule"],
      category: "Skin Care",
    },
    {
      name: "Minocycline",
      aliases: ["Minocycline 50mg Capsule"],
      category: "Skin Care",
    },
    {
      name: "Pimecrolimus",
      aliases: ["Pimecrolimus Cream 1%"],
      category: "Skin Care",
    },
    {
      name: "Hydrocortisone",
      aliases: ["Hydrocortisone Cream 1%"],
      category: "Skin Care",
    },
    {
      name: "Mometasone",
      aliases: ["Mometasone Furoate 0.1%"],
      category: "Skin Care",
    },
    {
      name: "Moisturizer Complex",
      aliases: ["Cerave Moisturizing Lotion"],
      category: "Skin Care",
    },
    {
      name: "Petrolatum",
      aliases: ["Aquaphor Lip Balm"],
      category: "Skin Care",
    },
    {
      name: "Tocopherol",
      aliases: ["Vitamin E Oil 100% Pure"],
      category: "Skin Care",
    },
    {
      name: "Rose Extract",
      aliases: ["Rose Water Facial Toner"],
      category: "Skin Care",
    },
    // Medical Devices
    {
      name: "Digital Thermometer",
      aliases: [
        "Digital Thermometer Underarm",
        "Digital Thermometer Ear",
        "Infrared Forehead Thermometer",
        "Oral Digital Thermometer",
        "Rectal Digital Thermometer",
        "Basal Body Temperature Thermometer",
        "Digital Thermometer 60 Second",
      ],
      category: "Medical Devices",
    },
    {
      name: "Mercury",
      aliases: ["Mercury Thermometer Glass", "Mercury Sphygmomanometer"],
      category: "Medical Devices",
    },
    {
      name: "Automatic",
      aliases: [
        "Omron Automatic Blood Pressure Monitor",
        "Philips Omron BP Monitor Digital",
      ],
      category: "Medical Devices",
    },
    {
      name: "Digital Monitor",
      aliases: ["Philips Omron BP Monitor Digital"],
      category: "Medical Devices",
    },
    {
      name: "Acoustic",
      aliases: [
        "Dual Head Stethoscope Adult",
        "Cardiology Stethoscope Premium",
      ],
      category: "Medical Devices",
    },
    {
      name: "Electronic",
      aliases: [
        "Electronic Stethoscope Digital",
        "Digital Body Weight Scale",
        "Smart Weighing Scale WiFi",
      ],
      category: "Medical Devices",
    },
    {
      name: "Mechanical",
      aliases: ["Mechanical Weighing Scale"],
      category: "Medical Devices",
    },
    {
      name: "Infant Safe",
      aliases: ["Baby Weight Scale Digital"],
      category: "Medical Devices",
    },
    {
      name: "Stadiometer",
      aliases: ["Height Measurement Scale"],
      category: "Medical Devices",
    },
    {
      name: "Smart BMI",
      aliases: ["BMI Measurement Scale Digital"],
      category: "Medical Devices",
    },
    {
      name: "Foldable",
      aliases: ["Manual Wheelchair Lightweight"],
      category: "Medical Devices",
    },
    {
      name: "Support",
      aliases: [
        "Walking Cane Adjustable",
        "Walker Frame Aluminum",
        "Crutches Pair",
        "Lumbar Support Belt",
        "Wrist Support Brace",
      ],
      category: "Medical Devices",
    },
    {
      name: "Therapeutic",
      aliases: [
        "Electric Heating Pad",
        "Ice Pack Reusable",
        "Heat Therapy Gel Pack",
      ],
      category: "Medical Devices",
    },
    {
      name: "Electrotherapy",
      aliases: ["TENS Unit Pain Relief"],
      category: "Medical Devices",
    },
    {
      name: "Orthopedic",
      aliases: ["Cervical Traction Device"],
      category: "Medical Devices",
    },
    {
      name: "Elastic",
      aliases: ["Knee Brace Support", "Ankle Support Wrap"],
      category: "Medical Devices",
    },
    {
      name: "Compression",
      aliases: ["Compression Stocking Knee High"],
      category: "Medical Devices",
    },
    {
      name: "Band-Aid",
      aliases: ["Sterile Adhesive Bandages"],
      category: "Medical Devices",
    },
    {
      name: "Medical Grade",
      aliases: [
        "Disposable Syringe 2ml",
        "Disposable Syringe 5ml",
        "Disposable Syringe 10ml",
      ],
      category: "Medical Devices",
    },
    {
      name: "Hypodermic",
      aliases: ["Medical Needle 23G"],
      category: "Medical Devices",
    },
    {
      name: "Sterile",
      aliases: ["IV Infusion Set"],
      category: "Medical Devices",
    },
    {
      name: "Latex",
      aliases: ["Gloves Disposable Latex"],
      category: "Medical Devices",
    },
    {
      name: "Nitrile",
      aliases: ["Gloves Disposable Nitrile"],
      category: "Medical Devices",
    },
    {
      name: "N95",
      aliases: ["Face Mask N95 Respirator"],
      category: "Medical Devices",
    },
    {
      name: "Surgical",
      aliases: ["Surgical Face Mask Blue"],
      category: "Medical Devices",
    },
    {
      name: "Smart Monitor",
      aliases: ["Digital Wrist Blood Pressure"],
      category: "Medical Devices",
    },
    {
      name: "Diagnostic",
      aliases: [
        "Portable Ultrasound Machine",
        "ECG Machine Portable",
        "Sleep Apnea Detector",
        "Bone Density Scanner",
      ],
      category: "Medical Devices",
    },
    {
      name: "Lung Function",
      aliases: ["Portable Spirometer"],
      category: "Medical Devices",
    },
    {
      name: "Asthma",
      aliases: ["Peak Flow Meter"],
      category: "Medical Devices",
    },
    {
      name: "Aerosol",
      aliases: ["Portable Nebulizer"],
      category: "Medical Devices",
    },
    {
      name: "Medical Gas",
      aliases: ["Oxygen Concentrator", "Portable Oxygen Tank"],
      category: "Medical Devices",
    },
    {
      name: "Cool Mist",
      aliases: ["Humidifier Ultrasonic"],
      category: "Medical Devices",
    },
    {
      name: "Steam",
      aliases: ["Humidifier Warm Mist"],
      category: "Medical Devices",
    },
    {
      name: "Filter",
      aliases: ["Air Purifier HEPA"],
      category: "Medical Devices",
    },
    {
      name: "Storage",
      aliases: ["Medicine Cabinet Metal"],
      category: "Medical Devices",
    },
    {
      name: "Emergency",
      aliases: ["First Aid Kit Box"],
      category: "Medical Devices",
    },
    {
      name: "Ultraviolet",
      aliases: ["Bottle Sterilizer UV"],
      category: "Medical Devices",
    },
    {
      name: "Disinfectant",
      aliases: ["Disinfectant Spray Alcohol"],
      category: "Medical Devices",
    },
    {
      name: "Multi-Param",
      aliases: ["Digital Health Monitor"],
      category: "Medical Devices",
    },
    {
      name: "Wearable",
      aliases: ["Fitness Band Heart Rate", "Medical Alert Pendant"],
      category: "Medical Devices",
    },
    {
      name: "Smart Device",
      aliases: ["Automatic Pill Dispenser"],
      category: "Medical Devices",
    },
    {
      name: "SOS Button",
      aliases: ["Medical Alert Pendant"],
      category: "Medical Devices",
    },
    {
      name: "Powered",
      aliases: ["Mobility Scooter"],
      category: "Medical Devices",
    },
    {
      name: "Safety",
      aliases: ["Bed Rail Guard"],
      category: "Medical Devices",
    },
    {
      name: "Mechanical",
      aliases: ["Patient Lift Hoist"],
      category: "Medical Devices",
    },
    // Baby Care
    {
      name: "Infant Formula",
      aliases: ["Cow & Gate Follow-On Milk 1", "Nan Pro Stage 1"],
      category: "Baby Care",
    },
    {
      name: "Toddler Formula",
      aliases: [
        "Cow & Gate Toddler Milk",
        "Lactogen Stage 2 Toddler",
        "Nan Pro Stage 2",
      ],
      category: "Baby Care",
    },
    {
      name: "Milk Formula",
      aliases: ["Lactogen Infant Formula"],
      category: "Baby Care",
    },
    {
      name: "Diaper",
      aliases: [
        "Pampers Swaddlers Newborn Size",
        "Pampers Swaddlers Size S",
        "Pampers Swaddlers Size M",
        "Pampers Swaddlers Size L",
        "Pampers Pants Size M",
        "Pampers Pants Size L",
        "Pampers Pants Size XL",
        "Pampers Pants Size XXL",
        "Huggies Little Snugglers Size S",
        "Huggies Little Snugglers Size M",
        "Mamypoko Extra Soft Size S",
        "Mamypoko Extra Soft Size M",
      ],
      category: "Baby Care",
    },
    { name: "Pull-on Diaper", aliases: [], category: "Baby Care" },
    {
      name: "Zinc Oxide",
      aliases: ["Sudocrem Diaper Rash Cream", "Johnson's Diaper Rash Cream"],
      category: "Baby Care",
    },
    // ... (add more as needed from full product lists)
  ],
};

// Frequency normalization map
const FREQUENCY_MAP = {
  "1-0-1": "Twice daily",
  "0-1-1": "Twice daily",
  "1-1-1": "Thrice daily",
  "0-0-1": "Once daily",
  od: "Once daily",
  hs: "Once daily at night",
  bd: "Twice daily",
  tds: "Thrice daily",
  qid: "Four times daily",
  "once daily": "Once daily",
  "twice daily": "Twice daily",
  "thrice daily": "Thrice daily",
};

// Timing normalization map
const TIMING_MAP = {
  ac: "Before meals",
  pc: "After food",
  hs: "At bedtime",
  am: "Morning",
  pm: "Evening",
  morning: "Morning",
  evening: "Evening",
  night: "Night",
  "before food": "Before meals",
  "after food": "After food",
  "with food": "With food",
  "empty stomach": "Empty stomach",
};

// Dosage form normalization
const DOSAGE_FORMS = {
  tab: "Tablet",
  tablet: "Tablet",
  cap: "Capsule",
  capsule: "Capsule",
  syrup: "Syrup",
  inj: "Injection",
  injection: "Injection",
  drop: "Drops",
  drops: "Drops",
  gel: "Gel",
  cream: "Cream",
  ointment: "Ointment",
  suspension: "Suspension",
  powder: "Powder",
};

const parseMedicines = (text) => {
  if (!text || text.length < 5) {
    console.log("[PARSER] Text too short:", text?.length);
    return [];
  }

  console.log("[PARSER] Input text length:", text.length);
  console.log("[PARSER] Using comprehensive multi-strategy parser...");

  // Use the comprehensive Prescription Intelligence Engine
  const parseResult = parsePrescriptionOCR(text);
  const extractedMedicines = parseResult.medicines || [];

  console.log(
    "[PARSER] Comprehensive parser found",
    extractedMedicines.length,
    "medicines",
  );

  // Convert to the format expected by the controller
  const medicines = extractedMedicines.map((med) => {
    // Check if medicine is known in our database
    const isKnownMedicine = MEDICINE_DATABASE.medicines.some(
      (m) =>
        m.name.toLowerCase() === med.name.toLowerCase() ||
        m.aliases?.some((a) => a.toLowerCase() === med.name.toLowerCase()),
    );

    // Build frequency string from dosage pattern
    let frequency = med.dosage_pattern;
    if (med.frequency_per_day && !frequency) {
      frequency = `${med.frequency_per_day} times daily`;
    }

    return {
      name: med.name,
      strength: med.strength || undefined,
      frequency: frequency || undefined,
      timing: undefined, // Not extracted by comprehensive parser
      duration: med.duration_days ? `${med.duration_days} days` : undefined,
      notes: isKnownMedicine ? undefined : "Not in formulary: review manually",
      qty: med.total_quantity || 1,
      freq: frequency || undefined, // Keep for backward compatibility
      isKnown: isKnownMedicine,
      confidence: med.confidence || 0.5,
    };
  });

  console.log(
    "[PARSER] Returning",
    medicines.length,
    "medicines with confidence scores",
  );
  return medicines;
};

// Extract medicine details from a single line
// ═══════════════════════════════════════════════════════════════════
// LEGACY FUNCTION - NO LONGER USED
// Now using comprehensive parsePrescriptionOCR from prescriptionParser.js
// ═══════════════════════════════════════════════════════════════════
/*
const extractMedicineFromLine = (line, allLines, lineIndex) => {
  const result = {
    medicine_name: null,
    strength: null,
    dosage_form: null,
    frequency: null,
    timing: null,
    duration: null,
  };

  // Remove common prefixes
  let cleanLine = line.replace(/^[\d\.\-\*\s]+/, "").trim();

  // Try to match: [Dosage Form] [Medicine Name] [Strength]
  // Examples: "Tab Paracetamol 650mg", "Cap Amoxicillin 500mg", "Syrup Benadryl"

  // Extract dosage form (Tab, Cap, Syrup, etc)
  const dosageFormMatch = cleanLine.match(
    /^(Tab|Cap|Inj|Drop|Gel|Cream|Ointment|Suspension|Powder|Syrup|Injection|Tablet|Capsule|Drops?)\s+/i,
  );
  if (dosageFormMatch) {
    result.dosage_form =
      DOSAGE_FORMS[dosageFormMatch[1].toLowerCase()] || "Tablet";
    cleanLine = cleanLine.replace(dosageFormMatch[0], "").trim();
  } else {
    result.dosage_form = "Tablet"; // Default
  }

  // Try Pattern 1: "MedicineName Strength" (e.g., "Paracetamol 650mg")
  const strengthPattern =
    /^([A-Za-z\s]+?)\s+(\d{1,4})\s*(mg|mcg|ml|gm|g|IU|%)?/;
  const strengthMatch = cleanLine.match(strengthPattern);

  if (strengthMatch) {
    result.medicine_name = strengthMatch[1].trim();
    result.strength = strengthMatch[2] + " " + (strengthMatch[3] || "mg");
    cleanLine = cleanLine.replace(strengthMatch[0], "").trim();
  } else {
    // Try Pattern 2: Just medicine name (e.g., "Benadryl")
    const nameMatch = cleanLine.match(
      /^([A-Za-z\s]+?)(?:\s+\d|\s+(?:OD|BD|TDS|HS|once|twice|thrice)|$)/i,
    );
    if (nameMatch) {
      result.medicine_name = nameMatch[1].trim();
      cleanLine = cleanLine.replace(nameMatch[1], "").trim();
    }
  }

  // Normalize medicine name (expand abbreviations)
  if (result.medicine_name) {
    for (const [abbr, full] of Object.entries(
      MEDICINE_DATABASE.abbreviations,
    )) {
      if (result.medicine_name.toLowerCase() === abbr.toLowerCase()) {
        result.medicine_name = full;
        break;
      }
    }
  }

  // Extract frequency and timing from remaining text and next line
  const contextText = cleanLine + " " + (allLines[lineIndex + 1] || "");

  // Find frequency
  for (const [key, value] of Object.entries(FREQUENCY_MAP)) {
    if (contextText.toLowerCase().includes(key)) {
      result.frequency = value;
      break;
    }
  }

  // Find timing
  for (const [key, value] of Object.entries(TIMING_MAP)) {
    if (contextText.toLowerCase().includes(key)) {
      result.timing = value;
      break;
    }
  }

  // Extract duration (e.g., "5 days", "1 week")
  const durationMatch = contextText.match(
    /(\d+)\s*(day|week|month|days|weeks|months|x)/i,
  );
  if (durationMatch) {
    result.duration = durationMatch[0];
  }

  // Extract notes (remaining text)
  if (cleanLine) {
    result.notes = cleanLine.substring(0, 100);
  }

  return result;
};
*/

const buildResponse = (
  prescription,
  { ocrText, doctorName, issueDate, medicines, instructionLines },
) => ({
  success: true,
  prescriptionId: prescription._id,
  doctorName,
  issueDate,
  expiryDate: prescription.expiryDate,
  ocrText,
  medicines,
  instructionLines,
});

const requireOcrText = (ocrText, res) => {
  const clean = (ocrText || "").replace(/\s+/g, " ").trim();
  if (clean.length < 10) {
    return res
      .status(422)
      .json({ success: false, message: "OCR failed to read the image" });
  }
  return clean;
};

export const uploadPrescription = async (req, res) => {
  try {
    await ensureUploadsDir();
    const files = req.files || [];
    console.log(
      "MULTER FILES",
      files.map((f) => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        path: f.path,
        size: f.size,
      })),
    );

    if (!files.length)
      return res.status(400).json({ message: "No files uploaded" });
    if (!files[0].path || !fs.existsSync(files[0].path)) {
      return res.status(500).json({ message: "Upload failed: file not saved" });
    }

    const uploads = [];
    for (const [idx, file] of files.entries()) {
      const processed = await preprocessImage(file.path, idx);
      const uploaded = await uploadBufferToCloudinary(
        processed.buffer,
        `rx-${Date.now()}-${idx}`,
      );
      uploads.push({
        url: uploaded.secure_url,
        processedPath: processed.processedPath,
      });
    }

    const ocrTextRaw = await runOcr(uploads[0].processedPath);
    const ocrText = requireOcrText(ocrTextRaw, res);
    if (!ocrText) return; // response already sent

    const doctorName = parseDoctorName(ocrText, req.body.doctorName);
    const issueDate = parseIssueDate(ocrText, req.body.issueDate) || new Date();
    const medicines = parseMedicines(ocrText);
    const instructionLines = filterMedicineLines(ocrText);

    // SECURITY: Always use authenticated user's ID - never accept from request body
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Please log in to upload prescriptions",
        code: "AUTH_REQUIRED",
      });
    }

    const prescription = await Prescription.create({
      userId: req.user.id,
      images: uploads.map((u) => u.url),
      ocrText,
      doctorName,
      issueDate,
      expiryDate: addMonths(issueDate, 6),
      isExpired: false,
      medicines,
      status: "pending",
    });

    return res.status(201).json(
      buildResponse(prescription, {
        ocrText,
        doctorName,
        issueDate,
        medicines,
        instructionLines,
      }),
    );
  } catch (error) {
    console.error("uploadPrescription error", error);
    return res.status(500).json({ message: "Failed to upload prescription" });
  }
};

export const validatePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    // SECURITY: Users can only validate their own prescriptions
    if (prescription.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own prescriptions",
        code: "FORBIDDEN",
      });
    }

    const now = new Date();
    const isExpired = prescription.expiryDate < now;
    const daysLeft = Math.ceil(
      (prescription.expiryDate - now) / (1000 * 60 * 60 * 24),
    );
    const nearExpiry = !isExpired && daysLeft <= 30;

    if (prescription.isExpired !== isExpired) {
      prescription.isExpired = isExpired;
      await prescription.save();
    }

    return res.json({
      valid: !isExpired,
      nearExpiry,
      daysLeft,
      message: isExpired ? "Prescription expired" : "Prescription valid",
    });
  } catch (error) {
    console.error("validatePrescription error", error);
    return res.status(500).json({ message: "Failed to validate" });
  }
};

export const getUserPrescriptions = async (req, res) => {
  try {
    // SECURITY: Always use authenticated user's ID, ignore URL params
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Please log in to view prescriptions",
        code: "AUTH_REQUIRED",
      });
    }

    const prescriptions = await Prescription.find({ userId: req.user.id }).sort(
      {
        createdAt: -1,
      },
    );
    const now = new Date();
    const result = prescriptions.map((p) => {
      const expired = p.expiryDate < now;
      const daysLeft = Math.ceil((p.expiryDate - now) / (1000 * 60 * 60 * 24));
      return {
        ...p.toObject(),
        statusLabel: expired ? "expired" : "valid",
        nearExpiry: !expired && daysLeft <= 30,
        downloadUrl: p.images?.[0],
      };
    });
    return res.json(result);
  } catch (error) {
    console.error("getUserPrescriptions error", error);
    return res.status(500).json({ message: "Failed to fetch prescriptions" });
  }
};

export const reuploadPrescription = async (req, res) => {
  try {
    await ensureUploadsDir();
    const files = req.files || [];
    console.log(
      "MULTER REUPLOAD FILES",
      files.map((f) => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        path: f.path,
        size: f.size,
      })),
    );

    if (!files.length)
      return res.status(400).json({ message: "No files uploaded" });
    if (!files[0].path || !fs.existsSync(files[0].path)) {
      return res.status(500).json({ message: "Upload failed: file not saved" });
    }

    const uploads = [];
    for (const [idx, file] of files.entries()) {
      const processed = await preprocessImage(file.path, idx);
      const uploaded = await uploadBufferToCloudinary(
        processed.buffer,
        `rx-${Date.now()}-${idx}`,
      );
      uploads.push({
        url: uploaded.secure_url,
        processedPath: processed.processedPath,
      });
    }

    const ocrTextRaw = await runOcr(uploads[0].processedPath);
    const ocrText = requireOcrText(ocrTextRaw, res);
    if (!ocrText) return;

    const doctorName = parseDoctorName(ocrText, req.body.doctorName);
    const issueDate = parseIssueDate(ocrText, req.body.issueDate) || new Date();
    const medicines = parseMedicines(ocrText);

    const updated = await Prescription.findByIdAndUpdate(
      req.params.id,
      {
        images: uploads.map((u) => u.url),
        ocrText,
        doctorName,
        issueDate,
        expiryDate: addMonths(issueDate, 6),
        isExpired: false,
        status: "pending",
        medicines,
      },
      { new: true },
    );

    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json(
      buildResponse(updated, { ocrText, doctorName, issueDate, medicines }),
    );
  } catch (error) {
    console.error("reuploadPrescription error", error);
    return res.status(500).json({ message: "Failed to reupload" });
  }
};

export const downloadPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ message: "Not found" });
    // Simplify: redirect to first image URL (cloud-hosted)
    const target = prescription.images?.[0];
    if (!target) return res.status(404).json({ message: "No files found" });
    return res.redirect(target);
  } catch (error) {
    console.error("downloadPrescription error", error);
    return res.status(500).json({ message: "Failed to download" });
  }
};

export const adminReviewPrescription = async (req, res) => {
  try {
    const { status, adminNotes, expiryDate } = req.body;
    const update = { status, adminNotes };
    if (expiryDate) update.expiryDate = new Date(expiryDate);
    if (update.expiryDate) update.isExpired = update.expiryDate < new Date();
    const updated = await Prescription.findByIdAndUpdate(
      req.params.id,
      update,
      {
        new: true,
      },
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json(updated);
  } catch (error) {
    console.error("adminReviewPrescription error", error);
    return res.status(500).json({ message: "Failed to review prescription" });
  }
};

export const matchPrescriptionForOrder = async (prescriptionId, userId) => {
  if (!prescriptionId) return { ok: false, reason: "Missing prescription" };
  const prescription = await Prescription.findOne({
    _id: prescriptionId,
    userId,
  });
  if (!prescription) return { ok: false, reason: "Prescription not found" };
  if (prescription.isExpired || prescription.expiryDate < new Date())
    return { ok: false, reason: "Prescription expired" };
  return { ok: true, prescription };
};

// Test OCR endpoint
const samplePath = path.resolve(
  process.cwd(),
  "samples",
  "sample-prescription.png",
);

const ensureSampleImage = async () => {
  await fs.promises.mkdir(path.dirname(samplePath), { recursive: true });
  if (fs.existsSync(samplePath)) return samplePath;

  const svg = `<svg width="1200" height="700" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="80" y="120" font-size="48" font-family="Arial" fill="#000">Dr. Test Physician</text>
    <text x="80" y="190" font-size="40" font-family="Arial" fill="#000">Date: 2025-01-10</text>
    <text x="80" y="280" font-size="44" font-family="Arial" fill="#000">Paracetamol 500mg Qty 10 1-0-1</text>
    <text x="80" y="360" font-size="44" font-family="Arial" fill="#000">Amoxicillin 500mg Qty 6 0-1-1</text>
    <text x="80" y="440" font-size="44" font-family="Arial" fill="#000">Cetirizine 10mg Qty 5 once daily</text>
  </svg>`;

  const svgBuffer = Buffer.from(svg);
  await sharp({
    create: {
      width: 1200,
      height: 700,
      channels: 3,
      background: "#ffffff",
    },
  })
    .composite([{ input: svgBuffer, left: 0, top: 0 }])
    .png()
    .toFile(samplePath);

  return samplePath;
};

export const testOcr = async (req, res) => {
  try {
    await ensureUploadsDir();
    const sample = await ensureSampleImage();
    const processed = await preprocessImage(sample, "test");
    const ocrTextRaw = await runOcr(processed.processedPath);
    const ocrText = requireOcrText(ocrTextRaw, res);
    if (!ocrText) return;

    const doctorName = parseDoctorName(ocrText, "Dr. Test Physician");
    const issueDate = parseIssueDate(ocrText, "2025-01-10") || new Date();
    const medicines = parseMedicines(ocrText);

    return res.json({
      success: true,
      doctorName,
      issueDate,
      expiryDate: addMonths(issueDate, 6),
      ocrText,
      medicines,
      samplePath: processed.processedPath,
    });
  } catch (error) {
    console.error("testOcr error", error);
    return res.status(500).json({ message: "Test OCR failed" });
  }
};

// Export helper functions for reuse
export { runOcr, parseMedicines };
