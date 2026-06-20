/**
 * Prescription Medicine Line Filter
 * Binary filtering: KEEP or DISCARD lines based on strict signals.
 * - Preserve original line order
 * - Preserve original text (no normalization)
 */

const STRONG_FORM_WORDS = [
  "tab",
  "tablet",
  "cap",
  "capsule",
  "syr",
  "syrup",
  "inj",
  "injection",
  "drop",
  "drops",
  "oint",
  "ointment",
  "cream",
  "gel",
];

// Units list used for regex generation
const UNITS = ["mg", "mcg", "ml", "g", "iu", "%"];

const DOSAGE_PATTERNS = ["od", "bd", "tds", "hs", "sos"];

const WEAK_TIMING_WORDS = [
  "morning",
  "night",
  "eve",
  "evening",
  "afternoon",
  "aft",
  "before food",
  "after food",
  "bf",
  "af",
  "before meal",
  "after meal",
];

const EXCLUDE_PATTERNS = [
  /\bDr\.?\b/i,
  /\bMBBS\b|\bM\.?D\.?\b|\bM\.?S\.?\b/i,
  /\bSignature\b/i,
  /\bHospital\b|\bClinic\b|\bCentre\b|\bCenter\b/i,
  /\bPh:?\b|\bPhone\b|\bMob\.?\b|\bAddress\b/i,
  /\bReg(istration)?\b|\bReg\.?\s*No\b/i,
  /\bPatient\b|\bID\b|\bAge\b|\bGender\b|\bMale\b|\bFemale\b/i,
  /\bWt\b|\bWeight\b|\bTemp\b|\bBP\b/i,
  /\bRx\b|\bAdvice\b|\bFollow\s*Up\b|\bNotes\b|\bReview\b/i,
  /^\s*\*/i, // bullet advice lines like "* AVOID ..."
  /\bMedicine\s+Name\b.*\bDosage\b.*\bDuration\b/i, // header row
];

const DATE_ONLY =
  /^(?:\s*(?:Date[:\-]\s*)?(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s*[A-Za-z]{3,}\s*\d{4})\s*)$/i;

const NOISE_ONLY = /^[\s\-*_=+#\[\](){}/\\|]+$/;

function hasStrongFormWord(line) {
  const lower = line.toLowerCase();
  return STRONG_FORM_WORDS.some((w) => lower.includes(w));
}

function hasUnits(line) {
  const lower = line.toLowerCase();
  // Require units to appear as standalone tokens or immediately after a number
  // Examples: "500mg", "5 ml", "60000 IU", "10%"
  const unitPattern = new RegExp(
    String.raw`(?:\b\d+\s*(?:${UNITS.join("|")})\b|\b(?:${UNITS.join("|")})\b)`,
    "i",
  );
  return unitPattern.test(lower);
}

function hasDosagePattern(line) {
  const lower = line.toLowerCase();
  // Numeric hyphen patterns like 1-0-1, 0-1-0
  const hyphenPattern = /\b\d\s*-\s*\d(?:\s*-\s*\d)?\b/;
  if (hyphenPattern.test(line)) return true;
  // OD/BD/TDS/HS/SOS
  if (DOSAGE_PATTERNS.some((p) => lower.includes(p))) return true;
  return false;
}

function hasDurationIndicator(line) {
  const lower = line.toLowerCase();
  if (/\b(x|×)\b/.test(lower)) return true;
  if (/\b(days?|d|weeks?|wk)\b/.test(lower)) return true;
  if (/\bfor\s+\d+\s+(days?|d|weeks?|wk)\b/.test(lower)) return true;
  return false;
}

function hasWeakIndicators(line) {
  const lower = line.toLowerCase();
  let count = 0;
  // Numbers + hyphen pattern
  if (/\b\d\s*-\s*\d(?:\s*-\s*\d)?\b/.test(line)) count++;
  // Numbers near letters (e.g., 500mg or 5 ml)
  if (/\b\d+\s*[a-zA-Z]+\b|\b[a-zA-Z]+\s*\d+\b/.test(line)) count++;
  // Timing words
  if (WEAK_TIMING_WORDS.some((w) => lower.includes(w))) count++;
  // Food timing
  if (/\b(before|after)\s+(food|meal)\b/i.test(line)) count++;
  return count >= 2;
}

function shouldExclude(line) {
  if (!line || !line.trim()) return true;
  if (DATE_ONLY.test(line)) return true;
  if (NOISE_ONLY.test(line)) return true;
  return EXCLUDE_PATTERNS.some((re) => re.test(line));
}

export function filterMedicineLines(ocrText) {
  if (!ocrText || typeof ocrText !== "string") return "";
  const lines = ocrText.split(/\r?\n/);
  const kept = [];

  for (const line of lines) {
    // Evaluate each line independently; preserve original text
    if (shouldExclude(line)) continue;

    const keep =
      hasStrongFormWord(line) ||
      hasUnits(line) ||
      hasDosagePattern(line) ||
      hasDurationIndicator(line) ||
      hasWeakIndicators(line);

    if (keep) kept.push(line);
  }

  // Plain text output: one line per instruction
  return kept.join("\n");
}

export default filterMedicineLines;

