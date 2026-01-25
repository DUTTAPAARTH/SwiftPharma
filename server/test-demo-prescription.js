/**
 * Test the parser with the actual demo prescription
 */

import { parsePrescriptionOCR } from "./src/services/prescriptionParser.js";

const demoPrescriptionText = `Dr. Onkar Bhave
M.B.B.S., M.D., M.S. | Reg. No: 2709881
Mob. No: 8983390126

Care Clinic
Near Axis Bank, Kothrud, Pune - 411038.
Ph: 094233 80390, Timing: 09:00 AM - 02:00 PM | Closed: Thursday

Date: 27-Apr-2020, 04:37 PM

ID: 266 - DEMO PATIENT (M)
Address: PUNE
Temp (deg): 35, BP: 120/80 mmHg

Medicine Name                    Dosage                  Duration
1) TAB. DEMO MEDICINE 1         1 Morning, 1 Night      10 Days
                                 (Before Food)           (Tot:20 Tab)

2) CAP. DEMO MEDICINE 2         1 Morning, 1 Night      10 Days
                                 (Before Food)           (Tot:20 Cap)

3) TAB. DEMO MEDICINE 3         1 Morning, 1 Aft, 1 Eve, 1 Night  10 Days
                                 (After Food)            (Tot:40 Tab)

4) TAB. DEMO MEDICINE 4         1/2 Morning, 1/2 Night  10 Days
                                 (After Food)            (Tot:10 Tab)

Advice Given:
* AVOID OILY AND SPICY FOOD

Follow Up: 12-05-2020

Charts

Signature
Dr. Onkar Bhave
M.B.B.S., M.D., M.S.`;

console.log("\n🧪 Testing Demo Prescription Parser\n");
console.log("=".repeat(60));

const result = parsePrescriptionOCR(demoPrescriptionText);

console.log("\n📊 RESULTS:");
console.log("-".repeat(60));
console.log(`Total medicines found: ${result.medicines.length}`);
console.log(`Expected: 4 medicines`);
console.log(`Status: ${result.medicines.length === 4 ? "✅ PASS" : "❌ FAIL"}`);

console.log("\n📝 Extracted Medicines:");
console.log("-".repeat(60));
result.medicines.forEach((med, index) => {
  console.log(`\n${index + 1}. ${med.name}`);
  console.log(`   Strength: ${med.strength || "N/A"}`);
  console.log(`   Dosage: ${med.dosage_pattern || "N/A"}`);
  console.log(`   Frequency/day: ${med.frequency_per_day || "N/A"}`);
  console.log(`   Duration: ${med.duration_days || "N/A"} days`);
  console.log(`   Total Qty: ${med.total_quantity || "N/A"}`);
  console.log(`   Confidence: ${(med.confidence * 100).toFixed(0)}%`);
});

console.log("\n" + "=".repeat(60));
console.log(
  result.medicines.length === 4 ? "✅ TEST PASSED" : "❌ TEST FAILED",
);
console.log("=".repeat(60) + "\n");
