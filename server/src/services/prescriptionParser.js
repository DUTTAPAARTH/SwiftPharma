/**
 * SwiftPharma Prescription Intelligence Engine
 * Converts raw OCR text into structured, medically-accurate JSON
 */

// Comprehensive medicine database with aliases
const MEDICINE_DATABASE = {
  // Vitamins & Supplements
  cholecalciferol: {
    standardName: "Cholecalciferol (Vitamin D3)",
    aliases: [
      "Vitamin D3",
      "D3",
      "Vit D3",
      "Cholicalciferol",
      "Cholcalciferol",
      "Cholocalciferol",
      "Cholocalcforol",
      "Calciferol",
    ],
    category: "Vitamins",
  },
  vitaminb12: {
    standardName: "Vitamin B12",
    aliases: ["B12", "Cyanocobalamin", "Cobalamin"],
    category: "Vitamins",
  },
  calcium: {
    standardName: "Calcium",
    aliases: ["Calcium supplement", "Ca", "Calcium citrate"],
    category: "Vitamins",
  },
  iron: {
    standardName: "Iron",
    aliases: ["Iron supplement", "Fe", "Ferrous sulfate"],
    category: "Vitamins",
  },
  multivitamin: {
    standardName: "Multivitamin",
    aliases: ["Multi vitamin", "MV"],
    category: "Vitamins",
  },

  // Pain Relief & Fever
  paracetamol: {
    standardName: "Paracetamol",
    aliases: ["PCM", "Acetaminophen", "Crocin", "Dolo"],
    category: "Pain Relief",
  },
  ibuprofen: {
    standardName: "Ibuprofen",
    aliases: ["IBU", "Brufen"],
    category: "Pain Relief",
  },
  aspirin: {
    standardName: "Aspirin",
    aliases: ["ASA"],
    category: "Pain Relief",
  },
  diclofenac: {
    standardName: "Diclofenac",
    aliases: ["Voltaren"],
    category: "Pain Relief",
  },
  naproxen: {
    standardName: "Naproxen",
    aliases: ["NPX"],
    category: "Pain Relief",
  },
  aceclofenac: {
    standardName: "Aceclofenac",
    aliases: ["ACF"],
    category: "Pain Relief",
  },

  // Diabetes
  metformin: {
    standardName: "Metformin",
    aliases: ["Met", "Glucophage"],
    category: "Diabetes",
  },
  glibenclamide: {
    standardName: "Glibenclamide",
    aliases: ["Glyburide", "Daonil"],
    category: "Diabetes",
  },
  gliclazide: {
    standardName: "Gliclazide",
    aliases: ["Diamicron", "GCZ"],
    category: "Diabetes",
  },
  glimepiride: {
    standardName: "Glimepiride",
    aliases: ["Amaryl"],
    category: "Diabetes",
  },
  sitagliptin: {
    standardName: "Sitagliptin",
    aliases: ["Januvia"],
    category: "Diabetes",
  },

  // Cardiac & BP
  atenolol: {
    standardName: "Atenolol",
    aliases: ["Aten"],
    category: "Cardiac",
  },
  amlodipine: {
    standardName: "Amlodipine",
    aliases: ["Amlo"],
    category: "Cardiac",
  },
  lisinopril: {
    standardName: "Lisinopril",
    aliases: ["Prinivil"],
    category: "Cardiac",
  },
  enalapril: {
    standardName: "Enalapril",
    aliases: ["Enal"],
    category: "Cardiac",
  },
  ramipril: {
    standardName: "Ramipril",
    aliases: ["Ram"],
    category: "Cardiac",
  },
  losartan: {
    standardName: "Losartan",
    aliases: ["Cozaar"],
    category: "Cardiac",
  },
  telmisartan: {
    standardName: "Telmisartan",
    aliases: ["Telmis"],
    category: "Cardiac",
  },
  rosuvastatin: {
    standardName: "Rosuvastatin",
    aliases: ["Crestor"],
    category: "Cardiac",
  },

  // Respiratory
  cetirizine: {
    standardName: "Cetirizine",
    aliases: ["Zyrtec"],
    category: "Respiratory",
  },
  montelukast: {
    standardName: "Montelukast",
    aliases: ["Singulair"],
    category: "Respiratory",
  },
  salbutamol: {
    standardName: "Salbutamol",
    aliases: ["Ventolin", "Albuterol"],
    category: "Respiratory",
  },
  budesonide: {
    standardName: "Budesonide",
    aliases: ["Pulmicort"],
    category: "Respiratory",
  },

  // Antibiotic
  amoxicillin: {
    standardName: "Amoxicillin",
    aliases: ["Amox"],
    category: "Antibiotic",
  },
  azithromycin: {
    standardName: "Azithromycin",
    aliases: ["AZM", "Zithromax"],
    category: "Antibiotic",
  },
  cephalexin: {
    standardName: "Cephalexin",
    aliases: ["Cepha"],
    category: "Antibiotic",
  },

  // GI & Digestion
  omeprazole: {
    standardName: "Omeprazole",
    aliases: ["OMP", "Prilosec"],
    category: "GI",
  },
  pantoprazole: {
    standardName: "Pantoprazole",
    aliases: ["PAN"],
    category: "GI",
  },
  ranitidine: {
    standardName: "Ranitidine",
    aliases: ["RAN", "Zantac"],
    category: "GI",
  },

  // Vitamins
  vitaminc: {
    standardName: "Vitamin C",
    aliases: ["Vit C", "Ascorbic Acid"],
    category: "Vitamin",
  },
  vitamind: {
    standardName: "Vitamin D3",
    aliases: ["Vit D", "D3", "Cholecalciferol"],
    category: "Vitamin",
  },
  vitaminb: {
    standardName: "Vitamin B Complex",
    aliases: ["Vit B", "B Complex"],
    category: "Vitamin",
  },
  zinc: {
    standardName: "Zinc",
    aliases: ["Zn"],
    category: "Vitamin",
  },
};

/**
 * Find medicine in database and return standardized name
 * Uses exact match, alias match, and fuzzy matching for OCR errors
 */
const findMedicine = (text) => {
  const cleaned = text.toLowerCase().trim();

  // Skip common non-medicine words and very short words
  if (
    cleaned.length < 3 ||
    /^(x|r|no|and|or|for|the|a|an|tab|cap|inj|dr|id|ph|mob|am|pm|date|temp|deg|bp)$/.test(
      cleaned,
    )
  ) {
    return null;
  }

  // Skip words that are clearly not medicines (numbers, measurements, dates)
  if (/^\d+$/.test(cleaned) || /mg|mcg|ml|deg|mmhg/i.test(cleaned)) {
    return null;
  }

  // Exact key match
  for (const [key, med] of Object.entries(MEDICINE_DATABASE)) {
    if (key === cleaned) return med.standardName;
  }

  // Exact alias match
  for (const [key, med] of Object.entries(MEDICINE_DATABASE)) {
    if (med.aliases.some((alias) => alias.toLowerCase() === cleaned)) {
      return med.standardName;
    }
  }

  // Partial/prefix match (handles OCR typos) - BUT only if word is reasonably long
  if (cleaned.length >= 5) {
    for (const [key, med] of Object.entries(MEDICINE_DATABASE)) {
      // Only match if word is at least 70% of the key length to avoid false matches
      const minLength = Math.ceil(key.length * 0.7);
      if (cleaned.length >= minLength && key.startsWith(cleaned)) {
        return med.standardName;
      }

      // Or if the key is a substring of the word (for compound names)
      if (
        cleaned.length >= minLength &&
        cleaned.includes(key) &&
        key.length >= 5
      ) {
        return med.standardName;
      }
    }
  }

  // Levenshtein distance for close matches (handle single letter typos)
  // BUT only for words that are reasonably long (>= 6 characters)
  if (cleaned.length >= 6) {
    let bestMatch = null;
    let bestDistance = 2; // Stricter threshold

    for (const [key, med] of Object.entries(MEDICINE_DATABASE)) {
      if (key.length >= 6) {
        const distance = levenshteinDistance(cleaned, key);
        if (distance < bestDistance && distance <= key.length * 0.2) {
          bestDistance = distance;
          bestMatch = med.standardName;
        }
      }
    }

    return bestMatch;
  }

  return null;
};

/**
 * Calculate Levenshtein distance between two strings
 */
const levenshteinDistance = (s1, s2) => {
  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(0));

  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator,
      );
    }
  }

  return track[s2.length][s1.length];
};

/**
 * 🧠 Parse dosage pattern with INTELLIGENCE RULES
 *
 * Rules:
 * - 1-0-1 → frequency_per_day = 2
 * - 1-1-1 → frequency_per_day = 3
 * - OD → 1
 * - BD → 2
 * - TDS → 3
 * - QID → 4
 */
const parseDosagePattern = (text) => {
  if (!text) return { pattern: null, frequency: null, confidence: 0 };

  const normalized = text.toLowerCase().trim();

  // Pattern like "1-0-1", "0-1-1", "1-1-1", etc.
  const patternMatch = normalized.match(/(\d)\s*-\s*(\d)\s*-\s*(\d)/);
  if (patternMatch) {
    const morning = parseInt(patternMatch[1]);
    const afternoon = parseInt(patternMatch[2]);
    const evening = parseInt(patternMatch[3]);
    const frequency = morning + afternoon + evening;

    return {
      pattern: `${morning}-${afternoon}-${evening}`,
      frequency: frequency > 0 ? frequency : null,
      confidence: 0.95,
    };
  }

  // OD (Once Daily)
  if (/\b(?:od|o\.d\.|once\s*daily|once\s*a\s*day)\b/i.test(normalized)) {
    return { pattern: "OD", frequency: 1, confidence: 0.92 };
  }

  // BD (Twice Daily)
  if (/\b(?:bd|b\.d\.|twice\s*daily|twice\s*a\s*day)\b/i.test(normalized)) {
    return { pattern: "BD", frequency: 2, confidence: 0.92 };
  }

  // TDS (Thrice Daily / Three times)
  if (/\b(?:tds|t\.d\.s\.|thrice\s*daily|three\s*times)\b/i.test(normalized)) {
    return { pattern: "TDS", frequency: 3, confidence: 0.92 };
  }

  // QID (Four times daily)
  if (/\b(?:qid|q\.i\.d\.|four\s*times)\b/i.test(normalized)) {
    return { pattern: "QID", frequency: 4, confidence: 0.9 };
  }

  // Numeric frequency like "2x", "3x", "2 times", "3 times per day"
  const numMatch = normalized.match(/(\d)\s*(?:x|times)/);
  if (numMatch) {
    const freq = parseInt(numMatch[1]);
    return {
      pattern: `${freq}x`,
      frequency: freq,
      confidence: 0.85,
    };
  }

  // If pattern contains a number but no clear format, treat with low confidence
  const singleNum = normalized.match(/\b([1-4])\b/);
  if (singleNum) {
    return {
      pattern: singleNum[1],
      frequency: parseInt(singleNum[1]),
      confidence: 0.5,
    };
  }

  return { pattern: normalized, frequency: null, confidence: 0.3 };
};

/**
 * 🔢 Parse duration with enhanced pattern matching
 *
 * Handles: "5 days", "×7d", "x 5 days", "for 10 days", "7d", "10 days"
 */
const parseDuration = (text) => {
  if (!text) return { duration: null, confidence: 0 };

  const normalized = text.toLowerCase().trim();

  // Match patterns: "5 days", "7d", "x 5 days", "×7d", "for 10 days"
  const durationMatch = normalized.match(
    /(?:x|×|for|duration)?\s*(\d+)\s*(?:days?|d\b)/i,
  );
  if (durationMatch) {
    const days = parseInt(durationMatch[1]);
    // Sanity check: duration should be 1-90 days
    if (days > 0 && days <= 90) {
      return {
        duration: days,
        confidence: 0.95,
      };
    }
  }

  // Weeks pattern: "1 week", "2 weeks"
  const weekMatch = normalized.match(/(\d+)\s*(?:weeks?|wks?)\b/i);
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1]);
    if (weeks > 0 && weeks <= 12) {
      return {
        duration: weeks * 7,
        confidence: 0.9,
      };
    }
  }

  // Months pattern: "1 month", "2 months" (rare but possible)
  const monthMatch = normalized.match(/(\d+)\s*(?:months?|mon)\b/i);
  if (monthMatch) {
    const months = parseInt(monthMatch[1]);
    if (months > 0 && months <= 3) {
      return {
        duration: months * 30,
        confidence: 0.85,
      };
    }
  }

  // Standalone number (ambiguous - could be days)
  const numMatch = normalized.match(/^(\d+)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num > 0 && num <= 90) {
      return {
        duration: num,
        confidence: 0.6, // Lower confidence for ambiguous input
      };
    }
  }

  return { duration: null, confidence: 0 };
};

/**
 * ⚖️ Parse strength with comprehensive unit recognition
 *
 * Handles: "650 mg", "500mg", "650 MG", "1g", "1000mcg", "5ml", "10%", "500 IU"
 */
const parseStrength = (text) => {
  if (!text) return { strength: null, confidence: 0 };

  const normalized = text.toLowerCase().trim();

  // Match patterns: "650 mg", "500mg", "1.5g", "1000 mcg", "5 ml", "10%"
  const strengthMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|gm?|ml|cc|iu|units?|%)?/i,
  );

  if (strengthMatch) {
    const amount = strengthMatch[1];
    let unit = strengthMatch[2] || "mg"; // Default to mg if no unit

    // Normalize unit variations
    if (unit === "µg") unit = "mcg";
    if (unit === "gm") unit = "g";
    if (unit === "cc") unit = "ml";

    return {
      strength: `${amount} ${unit}`.trim(),
      confidence: 0.95,
    };
  }

  // If text contains numbers but no match, return as-is with lower confidence
  if (/\d/.test(normalized)) {
    return {
      strength: normalized,
      confidence: 0.5,
    };
  }

  return { strength: null, confidence: 0 };
};

/**
 * 🏥 Extract doctor name and qualification with enhanced pattern matching
 */
const extractDoctor = (text) => {
  const lines = text.split("\n");

  let name = null;
  let qualification = null;

  for (const line of lines) {
    // Match "Dr. Name" or "Dr Name" with various formats
    const docMatch = line.match(
      /(?:Dr\.?|Doctor)\s+([A-Z][a-zA-Z\s\.]+?)(?:\s*,|\s+[A-Z]{2,}|\n|$)/i,
    );
    if (docMatch && !name) {
      name = docMatch[0].trim();
      // Clean up extra spaces
      name = name.replace(/\s+/g, " ");
    }

    // Match comprehensive qualifications
    const qualMatch = line.match(
      /\b(MBBS|BDS|BAMS|BHMS|BNYS|MD|MS|DM|MCh|DNB|DCH|DGO|DDV|DOMS|DTCD|FCPS|MRCP|FRCS|FRCOG|PLAB|PhD|MPH|MHA)(?:\s*,?\s*(MBBS|BDS|BAMS|BHMS|BNYS|MD|MS|DM|MCh|DNB|DCH|DGO|DDV|DOMS|DTCD|FCPS|MRCP|FRCS|FRCOG|PLAB|PhD|MPH|MHA))*\b/i,
    );
    if (qualMatch && !qualification) {
      qualification = qualMatch[0].trim();
      // Remove trailing commas
      qualification = qualification.replace(/,\s*$/, "");
    }
  }

  return { name, qualification };
};

/**
 * 📅 Extract date in various formats with comprehensive parsing
 */
const extractDate = (text) => {
  // Match DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD.MM.YYYY
  const dateMatch = text.match(
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})|(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,
  );

  if (dateMatch) {
    let day, month, year;

    if (dateMatch[1]) {
      // DD/MM/YYYY or DD-MM-YYYY format
      day = parseInt(dateMatch[1]);
      month = parseInt(dateMatch[2]);
      year = parseInt(dateMatch[3]);
    } else {
      // YYYY-MM-DD format
      year = parseInt(dateMatch[4]);
      month = parseInt(dateMatch[5]);
      day = parseInt(dateMatch[6]);
    }

    // Handle 2-digit years
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }

    // Validate date
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
      const date = new Date(year, month - 1, day);
      return date.toISOString().split("T")[0]; // YYYY-MM-DD
    }
  }

  // Try text-based dates: "12 Jan 2025", "Jan 12, 2025"
  const textDateMatch = text.match(
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i,
  );
  if (textDateMatch) {
    const monthMap = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const day = parseInt(textDateMatch[1]);
    const month = monthMap[textDateMatch[2].toLowerCase().slice(0, 3)];
    let year = parseInt(textDateMatch[3]);
    if (year < 100) year += 2000;

    const date = new Date(year, month, day);
    return date.toISOString().split("T")[0];
  }

  return null;
};

/**
 * 🔹 SwiftPharma Prescription Intelligence Engine
 * Analyzes raw OCR text from medical prescriptions and converts it into structured JSON
 *
 * CORE RULE: Detect ALL medicines present. Never stop after the first medicine.
 * Each medicine must be a separate object in the array.
 */
export const parsePrescriptionOCR = (ocrText) => {
  // Return empty structure if no valid input
  if (!ocrText || ocrText.length < 5) {
    return {
      medicines: [],
      doctor: { name: null, qualification: null },
      hospital: null,
      prescription_date: null,
      safety_flags: {
        duplicate_medicines: false,
        unclear_dosage: true,
        missing_duration: true,
        handwritten_uncertain: true,
      },
    };
  }

  const lines = ocrText.split("\n").map((line) => line.trim());
  const medicines = [];
  const medicineNamesFound = new Set();

  // ═══════════════════════════════════════════════════════════════
  // MULTI-STRATEGY MEDICINE EXTRACTION
  // Strategy 1: Line-by-line comprehensive scan (PRIMARY)
  // Strategy 2: Structured field extraction (SECONDARY)
  // Strategy 3: Pattern-based extraction (FALLBACK)
  // ═══════════════════════════════════════════════════════════════

  // STRATEGY 1: Comprehensive line-by-line scan for ALL medicines
  let currentMedicine = null;
  let contextBuffer = { dosage: null, duration: null };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
    const lineAfterNext = i + 2 < lines.length ? lines[i + 2] : "";

    // Skip metadata/header lines - ENHANCED FILTERING
    if (
      !line ||
      line.length < 3 ||
      /^(Rx|Dr\.|Date|Signature|Clinic|Hospital|Address|Phone|Email|Note|Regards|Sincerely|Follow|Charts?|Temp|BP|M\.B\.B\.S|M\.D\.|M\.S\.|Care|Near|Ph:|Mob:|ID:|Patient|Advice|Given)/i.test(
        line,
      )
    ) {
      continue;
    }

    // Skip lines with dates, phone numbers, IDs, measurements
    if (
      /\d{2}[-\/]\d{2}[-\/]\d{4}/.test(line) || // Dates like 27-04-2020
      /\d{10}/.test(line) || // 10 digit phone numbers
      /ID:\s*\d+/.test(line) || // ID: 266
      /\d+\/\d+\s*mmHg/.test(line) || // Blood pressure
      /(deg|°)\s*[CF]/.test(line) || // Temperature
      /barcode|\|{3,}/.test(line) // Barcodes or separators
    ) {
      continue;
    }

    // Check if line starts with medicine indicators (TAB, CAP, numbered list)
    const hasMedicinePrefix =
      /^\d+[\)\.]?\s*(TAB|CAP|INJ|SYR|SYRUP|DROP|TABLET|CAPSULE|INJECTION)/i.test(
        line,
      );

    // Only process lines that look like medicine prescriptions
    if (!hasMedicinePrefix && line.split(/\s+/).length > 10) {
      // Long lines without medicine prefix are likely metadata
      continue;
    }

    // Check if this line contains a medicine name
    const words = line.split(/\s+/);
    let medicineName = null;
    let strengthText = "";
    let dosageText = "";
    let durationText = "";
    let isFromDatabase = false;

    // EXTRACTION METHOD 1: Try to find known medicine from database
    const maxWordsToCheck = Math.min(words.length, 8); // Check first 8 words
    for (let j = 0; j < maxWordsToCheck; j++) {
      const word = words[j];
      const standardName = findMedicine(word);

      if (standardName) {
        medicineName = standardName;
        strengthText = words.slice(j + 1).join(" ");
        isFromDatabase = true;
        break;
      }
    }

    // EXTRACTION METHOD 2: If no database match but line has medicine prefix, extract name manually
    // This handles demo medicines, test prescriptions, and medicines not in database
    if (!medicineName && hasMedicinePrefix) {
      const prefixMatch = line.match(
        /^\d+[\)\.]?\s*(TAB|CAP|INJ|SYR|SYRUP|DROP|TABLET|CAPSULE|INJECTION)\.?\s+(.+)/i,
      );
      if (prefixMatch && prefixMatch[2]) {
        // Extract medicine name - take everything until we hit dosage keywords or timing info
        const remainingText = prefixMatch[2].trim();
        // Match: word chars, spaces, hyphens, numbers until we hit common dosage/timing patterns
        const nameMatch = remainingText.match(
          /^([A-Z][A-Za-z0-9\s\-]+?)(?:\s+\d+\s*(mg|mcg|ml|gm|g|IU|%)|$)/i,
        );
        if (nameMatch) {
          medicineName = nameMatch[1].trim();
          strengthText = remainingText.substring(nameMatch[0].length);
          isFromDatabase = false;
        } else {
          // Fallback: Just take the first few words as medicine name
          const words = remainingText.split(/\s+/);
          medicineName = words.slice(0, 3).join(" ").trim(); // Take up to 3 words
          strengthText = words.slice(3).join(" ");
          isFromDatabase = false;
        }
      }
    }

    // If medicine found (either from database or extracted from line), process it
    if (medicineName) {
      // Parse strength from same line
      const strengthResult = parseStrength(strengthText);

      // Check next lines for dosage and duration
      const combinedContext = `${line} ${nextLine} ${lineAfterNext}`;

      // Parse dosage pattern
      const dosageResult = parseDosagePattern(combinedContext);

      // Parse duration
      const durationResult = parseDuration(combinedContext);

      // Calculate total quantity
      let totalQuantity = null;
      if (dosageResult.frequency && durationResult.duration) {
        totalQuantity = dosageResult.frequency * durationResult.duration;
      }

      // Calculate confidence based on data completeness
      let confidence = isFromDatabase ? 0.6 : 0.5; // Higher base if from database
      if (strengthResult.confidence > 0) confidence += 0.15;
      if (dosageResult.confidence > 0) confidence += 0.2;
      if (durationResult.confidence > 0) confidence += 0.2;
      if (totalQuantity) confidence += 0.1;

      // Prevent duplicate medicines
      const medicineKey = medicineName.toLowerCase();
      if (!medicineNamesFound.has(medicineKey)) {
        medicines.push({
          name: medicineName,
          strength: strengthResult.strength || null,
          dosage_pattern: dosageResult.pattern || null,
          frequency_per_day: dosageResult.frequency || null,
          duration_days: durationResult.duration || null,
          total_quantity: totalQuantity,
          confidence: Math.min(confidence, 1.0),
        });

        medicineNamesFound.add(medicineKey);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 2: Extract from structured fields (if Strategy 1 found nothing)
  // ═══════════════════════════════════════════════════════════════
  if (medicines.length === 0) {
    // Look for "Composition:", "Medication:", or similar headers
    const compositionPattern =
      /(?:Composition|Medication|Medicines?|Drugs?|Gomposiion|Compostion)\s*[:=]\s*(.+?)(?:\n\n|Timing|Signature|Administration|$)/is;
    const compositionMatch = ocrText.match(compositionPattern);

    if (compositionMatch) {
      const compositionText = compositionMatch[1];
      const parts = compositionText.split(/[\n,;\/]/);

      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.length < 2) continue;

        const words = trimmed.split(/\s+/);
        for (const word of words) {
          const standardName = findMedicine(word);
          if (standardName) {
            const medicineKey = standardName.toLowerCase();
            if (!medicineNamesFound.has(medicineKey)) {
              const strengthText = words.slice(1).join(" ");
              const strengthResult = parseStrength(strengthText);

              medicines.push({
                name: standardName,
                strength: strengthResult.strength || null,
                dosage_pattern: null,
                frequency_per_day: null,
                duration_days: null,
                total_quantity: null,
                confidence: 0.6,
              });

              medicineNamesFound.add(medicineKey);
            }
            break; // Only take first medicine per line part
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STRATEGY 3: Pattern-based extraction (aggressive fallback)
  // NOTE: This should RARELY run - only if Strategy 1 & 2 failed completely
  // ═══════════════════════════════════════════════════════════════
  if (medicines.length === 0) {
    console.log(
      "[PARSER WARNING] Strategies 1 & 2 found no medicines. Using fallback scan.",
    );

    // Scan entire text for any medicine-like patterns
    const allWords = ocrText.split(/\s+/);
    let fallbackCount = 0;
    const MAX_FALLBACK_MEDICINES = 15; // Safety limit

    for (const word of allWords) {
      if (word.length < 5) continue; // Stricter length requirement for fallback
      if (fallbackCount >= MAX_FALLBACK_MEDICINES) break;

      const standardName = findMedicine(word);
      if (standardName) {
        const medicineKey = standardName.toLowerCase();
        if (!medicineNamesFound.has(medicineKey)) {
          medicines.push({
            name: standardName,
            strength: null,
            dosage_pattern: null,
            frequency_per_day: null,
            duration_days: null,
            total_quantity: null,
            confidence: 0.3, // Lower confidence for fallback
          });

          medicineNamesFound.add(medicineKey);
          fallbackCount++;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // METADATA EXTRACTION
  // ═══════════════════════════════════════════════════════════════
  const { name: doctorName, qualification } = extractDoctor(ocrText);

  const hospitalMatch = ocrText.match(
    /(?:Hospital|Clinic|Centre|Center|Nursing Home|Medical Center)\s*[:=]?\s*([A-Za-z\s&]+?)(?:\n|$)/i,
  );
  const hospital = hospitalMatch ? hospitalMatch[1].trim() : null;

  const prescriptionDate = extractDate(ocrText);

  // ═══════════════════════════════════════════════════════════════
  // SAFETY FLAGS
  // ═══════════════════════════════════════════════════════════════
  const uniqueMedicines = new Set(medicines.map((m) => m.name.toLowerCase()));
  const safety_flags = {
    duplicate_medicines: uniqueMedicines.size < medicines.length,
    unclear_dosage: medicines.some((m) => !m.frequency_per_day),
    missing_duration: medicines.some((m) => !m.duration_days),
    handwritten_uncertain:
      medicines.some((m) => m.confidence < 0.7) ||
      /[^a-zA-Z0-9\s\-\/\.\,\:\(\)]/g.test(ocrText),
  };

  // ═══════════════════════════════════════════════════════════════
  // FINAL OUTPUT (Structured JSON only)
  // ═══════════════════════════════════════════════════════════════
  return {
    medicines,
    doctor: {
      name: doctorName,
      qualification,
    },
    hospital,
    prescription_date: prescriptionDate,
    safety_flags,
  };
};

export default parsePrescriptionOCR;

