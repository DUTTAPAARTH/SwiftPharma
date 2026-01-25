import { parsePrescriptionOCR } from "./server/src/services/prescriptionParser.js";

// Actual OCR text from the prescription
const ocrText = `Pa ried
> N oi
LS i
< Tei
Li El
he ECR
gal fi
nl "
2) ENDOCRINE & METABOLISM "WN
)) | Coles By Sahai Path Lay
ta & Time: 08-Dac-2026
06:51
BP 120/80 mmHg | Pulse 71 bpm | Helght 182.6 cm | Weight 132k | spo; J
I 2 00%, v
Diagnosis: DYSGLYGAEMIA (7 PREDIABETES) , VIT, D DEFICIENCY. ors M3205 sf
2 Cr EMIA (L, MILD)
be BRINE ) AS
eRe D3 ST a00 Timing Fran, Duration
5 EF apoyo ml
Gomposiion : Cholocalcforol 80000 1U /GM Bod Time - Waskly - 6 Waska
Timing : 1 Night Bed Time —_— mm
Administration : Oral-To be swallowed
Notes : FOLLOWED BY MONTHLY
Mobs POUOWESPYMOMWY 0 00
Advice: 1600 Kcal Diet
Exercises as advised (30-45 minutes per day)
RMW REPORT
Tests Prescribed: OGTT WITH 75 GM ANHYDROUS GLUCOSE EQUIVALENT (0 HR AND 2 HR)
eee rE EN EN ANDES)
SS) .
Wl a) C=" of edly, DAL
|
J Gf ve
ay kl I ®) DI
© 12 Rani Ka Bagh, Ams: :`;

console.log("=== Testing Local Parser ===");
console.log("OCR Text Length:", ocrText.length);
console.log("\n=== Looking for: Cholecalciferol (Vitamin D3) ===");

const result = parsePrescriptionOCR(ocrText);
console.log("\n=== Parser Result ===");
console.log(JSON.stringify(result, null, 2));

console.log("\n=== Medicines Extracted ===");
console.log(`Count: ${result.medicines.length}`);
result.medicines.forEach((med, idx) => {
  console.log(
    `${idx + 1}. ${med.name} (${med.strength || "N/A"}) - ${med.dosage_pattern || "N/A"}`,
  );
});
