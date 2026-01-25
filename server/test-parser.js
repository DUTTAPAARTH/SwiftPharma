import { parseMedicines } from "./src/controllers/prescriptionController.js";

// Test samples from your provided format
const testSamples = [
  {
    name: "Simple Paracetamol",
    input: `Tab Paracetamol 650 mg
1-0-1 after food
for 5 days`,
    expected: { medicine_name: "Paracetamol", strength: "650 mg" },
  },
  {
    name: "Amoxicillin Capsule",
    input: `Cap Amoxicillin 500mg
1 capsule thrice daily
before meals x 7 days`,
    expected: { medicine_name: "Amoxicillin", strength: "500 mg" },
  },
  {
    name: "Syrup",
    input: `Syrup Benadryl
10 ml at night
for cough`,
    expected: { medicine_name: "Benadryl" },
  },
  {
    name: "PCM Abbreviation",
    input: `Tab PCM 650
OD × 3 days`,
    expected: { medicine_name: "Paracetamol", strength: "650 mg" },
  },
  {
    name: "Metformin",
    input: `Tab Metformin 500 mg
BD after food
Continue`,
    expected: { medicine_name: "Metformin", strength: "500 mg" },
  },
];

console.log("🧪 Testing Medicine Parser\n");
console.log("=".repeat(60));

testSamples.forEach((sample) => {
  console.log(`\n📋 Test: ${sample.name}`);
  console.log("-".repeat(60));
  console.log("INPUT:");
  console.log(sample.input);
  console.log("\nEXPECTED:");
  console.log(JSON.stringify(sample.expected, null, 2));

  try {
    const result = parseMedicines(sample.input);
    console.log("\nACTUAL RESULT:");
    console.log(JSON.stringify(result, null, 2));

    if (result.length > 0) {
      const first = result[0];
      const isCorrect =
        first.name
          .toLowerCase()
          .includes(sample.expected.medicine_name.toLowerCase()) &&
        (!sample.expected.strength ||
          first.strength?.includes(sample.expected.strength.split(" ")[0]));

      console.log(isCorrect ? "\n✅ PASS" : "\n❌ FAIL");
    } else {
      console.log("\n❌ FAIL - No medicines found");
    }
  } catch (err) {
    console.log("\n❌ ERROR:", err.message);
  }
  console.log("=".repeat(60));
});

console.log("\n✅ All tests completed!");
