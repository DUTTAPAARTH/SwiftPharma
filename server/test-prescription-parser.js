/**
 * 🧪 SwiftPharma Prescription Intelligence Engine - Test Cases
 *
 * This file contains test examples demonstrating the engine's capabilities
 */

// ═══════════════════════════════════════════════════════════════
// TEST CASE 1: Simple Single Medicine
// ═══════════════════════════════════════════════════════════════
const testCase1 = {
  name: "Single Medicine - Clear Format",
  ocrText: `
Dr. Rajesh Kumar, MBBS MD
City Hospital
Date: 24/01/2026

Rx:
Paracetamol 650 mg
1-0-1
5 days

Signature
  `,
  expectedOutput: {
    medicines: [
      {
        name: "Paracetamol",
        strength: "650 mg",
        dosage_pattern: "1-0-1",
        frequency_per_day: 2,
        duration_days: 5,
        total_quantity: 10,
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// TEST CASE 2: Multiple Medicines (Core Requirement)
// ═══════════════════════════════════════════════════════════════
const testCase2 = {
  name: "Multiple Medicines - Mixed Format",
  ocrText: `
Dr. S. Patel MBBS
Apollo Clinic
12 Jan 2026

Medication:
1. Amoxicillin 500mg
   BD
   7 days

2. Paracetamol 650 mg
   TDS
   for 5 days

3. Cetirizine 10mg
   OD x 10 days
  `,
  expectedOutput: {
    medicines: [
      {
        name: "Amoxicillin",
        total_quantity: 14, // 2 × 7 = 14
      },
      {
        name: "Paracetamol",
        total_quantity: 15, // 3 × 5 = 15
      },
      {
        name: "Cetirizine",
        total_quantity: 10, // 1 × 10 = 10
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// TEST CASE 3: Messy Handwritten (OCR Errors)
// ═══════════════════════════════════════════════════════════════
const testCase3 = {
  name: "Messy Handwritten - OCR Typos",
  ocrText: `
Dr. Kumar
Gomposiion: Cholocalciferol 60000IU
Timing: Once weekly
×4 weeks
  `,
  expectedOutput: {
    medicines: [
      {
        name: "Cholecalciferol (Vitamin D3)", // Standardized despite typo
        strength: "60000 IU",
        frequency_per_day: 1,
        duration_days: 28, // 4 weeks × 7 = 28
        total_quantity: 28,
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// TEST CASE 4: Missing Duration (Partial Data)
// ═══════════════════════════════════════════════════════════════
const testCase4 = {
  name: "Partial Data - Missing Duration",
  ocrText: `
Metformin 500mg
BD
  `,
  expectedOutput: {
    medicines: [
      {
        name: "Metformin",
        strength: "500 mg",
        dosage_pattern: "BD",
        frequency_per_day: 2,
        duration_days: null, // Missing
        total_quantity: null, // Cannot calculate
        confidence: 0.7, // Lower due to missing data
      },
    ],
    safety_flags: {
      missing_duration: true,
      unclear_dosage: false,
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// TEST CASE 5: Complex Multi-Medicine Real-World Example
// ═══════════════════════════════════════════════════════════════
const testCase5 = {
  name: "Real-World Complex Prescription",
  ocrText: `
Dr. Anita Sharma, MBBS MD (Medicine)
Metro Hospital & Research Centre
Date: 24-01-2026
Patient: Mr. Rahul Verma

Rx:
1. Tab Azithromycin 500mg - OD - 3 days
2. Tab Paracetamol 650mg - 1-1-1 - ×5d
3. Syrup Ascoril 5ml - TDS - 7 days  
4. Tab Omeprazole 20mg - 0-0-1 - for 10 days

Regards,
Dr. Anita Sharma
  `,
  expectedOutput: {
    medicines: [
      {
        name: "Azithromycin",
        strength: "500 mg",
        frequency_per_day: 1,
        total_quantity: 3,
      },
      {
        name: "Paracetamol",
        strength: "650 mg",
        frequency_per_day: 3,
        total_quantity: 15,
      },
      {
        name: "Ascoril LS Syrup", // Fuzzy matched
        strength: "5 ml",
        frequency_per_day: 3,
        total_quantity: 21,
      },
      {
        name: "Omeprazole",
        strength: "20 mg",
        frequency_per_day: 1,
        total_quantity: 10,
      },
    ],
    doctor: {
      name: "Dr. Anita Sharma",
      qualification: "MBBS MD",
    },
    hospital: "Metro Hospital & Research Centre",
    prescription_date: "2026-01-24",
  },
};

// ═══════════════════════════════════════════════════════════════
// TEST CASE 6: Abbreviations and Shorthand
// ═══════════════════════════════════════════════════════════════
const testCase6 = {
  name: "Abbreviations - Medical Shorthand",
  ocrText: `
Tab PCM 650mg - BD - 5d
Cap IBU 400mg - TDS - 3d
Tab Vit D3 60000IU - once weekly - 4 weeks
  `,
  expectedOutput: {
    medicines: [
      {
        name: "Paracetamol", // PCM alias
        total_quantity: 10,
      },
      {
        name: "Ibuprofen", // IBU alias
        total_quantity: 9,
      },
      {
        name: "Vitamin D3",
        total_quantity: 4,
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// EXPORT FOR TESTING
// ═══════════════════════════════════════════════════════════════
module.exports = {
  testCase1,
  testCase2,
  testCase3,
  testCase4,
  testCase5,
  testCase6,
};
