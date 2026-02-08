import Product from "../models/Product.js";

// System prompt - The foundation of pharmacist personality
const SYSTEM_PROMPT = `You are an AI Pharmacist assistant with years of experience helping patients safely use medicines.

Your role:
- Act like a calm, experienced pharmacist in a neighborhood pharmacy
- Answer in a friendly, reassuring tone with empathy
- Give general, safe guidance based on standard medical knowledge
- Never give exact dosage unless medicine information is provided
- For symptoms, give non-drug advice first, then suggest consulting a doctor
- Ask follow-up questions naturally like a real pharmacist would

Rules:
- You are NOT a doctor and cannot diagnose conditions
- Always include safety disclaimers subtly in your conversation
- If unsure about something, say so clearly and recommend professional consultation
- For emergencies (chest pain, difficulty breathing, severe allergic reactions), immediately advise seeing a doctor
- Acknowledge when patients share concerns and validate their feelings
- Use simple, everyday language - avoid complex medical jargon

Style:
- Conversational and warm, like talking to a trusted neighbor
- Use bullet points when listing steps or options
- Keep sentences short and clear
- Add appropriate emojis sparingly for warmth (💊, 🌡️, 💧, ⚠️)
- Show you care about the patient's wellbeing`;

const DISCLAIMER =
  "This information is for guidance only and does not replace professional medical advice.";

const EMERGENCY_MESSAGE =
  "This may require urgent medical attention. Please seek emergency care or consult a doctor immediately.";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeLanguage = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

// RAG: Retrieve and format medicine knowledge for context injection
const buildMedicineContext = (medicine) => {
  if (!medicine) return null;

  const context = {
    name: medicine.name || "Unknown",
    composition: medicine.composition || "Not specified",
    manufacturer: medicine.manufacturer || "Not specified",
    strength: medicine.strength || "As per label",
    type: medicine.type || "General medicine",
    prescriptionRequired:
      medicine.prescriptionRequired || medicine.isRx || false,
    uses: medicine.uses || "General health condition",
    sideEffects: medicine.sideEffects || "May vary - check package insert",
    precautions: medicine.precautions || "Follow doctor's advice",
    storage: medicine.storage || "Store in cool, dry place away from sunlight",
  };

  // Format context for injection into prompt
  return `
MEDICINE KNOWLEDGE (Retrieved from Database):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Medicine: ${context.name}
Composition: ${context.composition}
Manufacturer: ${context.manufacturer}
Strength: ${context.strength}
Type: ${context.type}
Prescription Required: ${context.prescriptionRequired ? "YES ⚠️" : "No"}

Common Uses: ${context.uses}

Typical Side Effects: ${context.sideEffects}

Precautions: ${context.precautions}

Storage Instructions: ${context.storage}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use this information to answer the patient's question accurately and safely.
`;
};

// Generate conversational general answer when medicine name is not provided
const generateGeneralAnswer = (question, context = {}, res) => {
  const qLower = (question || "").toLowerCase();
  const language = detectLanguage(question) || "english";
  const lines = [];

  // Detect symptom/complaint
  const isHeadache = /headache|head pain|sir me dard|sar dard/i.test(qLower);
  const isFever = /fever|temperature|garam|thapad|bukhar/i.test(qLower);
  const isBodyAche = /body ache|muscle pain|joint pain|jod me dard/i.test(
    qLower,
  );
  const isCough = /cough|coughing|khansi|ho ho/i.test(qLower);
  const isNausea =
    /nausea|nauseated|vomit|queasy|ji ghbrana|ulti|ghabrahat/i.test(qLower);
  const isAllergy = /allergy|allergic|itching|rash|khujli|dhadhed|eczema/i.test(
    qLower,
  );

  // Detect question type
  const isMissedDose = /miss(ed)? dose|forget|skip(ped)?|bhul gaya/i.test(
    qLower,
  );
  const isSideEffect = /side effect|adverse|reaction|problem|nuksan/i.test(
    qLower,
  );
  const isDosage =
    /dosage|dose|kitna|how much|how many|when to take|kab lena/i.test(qLower);
  const isFood = /food|khana|before|after|empty stomach|khali pet/i.test(
    qLower,
  );
  const isTiming =
    /timing|time|kab|when|subah|shaam|raat|morning|evening|night/i.test(qLower);
  const isInteraction =
    /interact|other medicine|dawa ke sath|combine|together/i.test(qLower);
  const isStorage = /store|storage|rakhna|keep|temperature/i.test(qLower);

  // Handle symptoms first
  if (isHeadache) {
    lines.push("**I see you have a headache.** 💊");
    lines.push("");
    lines.push("In general, here are safe steps:");
    lines.push("- Rest in a quiet, dark room");
    lines.push("- Stay hydrated - drink water");
    lines.push("- Apply a cold or warm compress to your head");
    lines.push(
      "- If pain is severe or lasts more than 2-3 hours, see a doctor",
    );
    lines.push("");
    lines.push(
      "If you have a headache medicine at home, tell me the name and I can check if it's suitable for you.",
    );
  } else if (isFever) {
    lines.push("**You have a fever.** 🌡️");
    lines.push("");
    lines.push("Important steps:");
    lines.push(
      "- Rest and stay hydrated - drink water, coconut water, or warm soup",
    );
    lines.push("- Avoid heavy, oily food");
    lines.push(
      "- If fever is above 103°F (39.4°C) or lasts more than 3 days, consult a doctor",
    );
    lines.push("- Monitor your symptoms");
    lines.push("");
    lines.push(
      "If you want to take a fever medicine, share the name and I can guide you on dosage and safety.",
    );
  } else if (isBodyAche) {
    lines.push("**Body or muscle pain can be uncomfortable.** ");
    lines.push("");
    lines.push("General relief tips:");
    lines.push("- Rest the affected area");
    lines.push("- Apply a warm compress (10-15 minutes)");
    lines.push("- Gentle stretching may help");
    lines.push("- Stay hydrated");
    lines.push(
      "- If pain is severe or doesn't improve in 2-3 days, see a doctor",
    );
    lines.push("");
    lines.push(
      "If you have a pain relief medicine, tell me the name and I'll guide you on how to use it safely.",
    );
  } else if (isCough) {
    lines.push("**A persistent cough needs attention.** 🤧");
    lines.push("");
    lines.push("Try these first:");
    lines.push("- Stay hydrated - warm water with honey and lemon");
    lines.push("- Avoid irritants like smoke or pollution");
    lines.push("- Get adequate rest");
    lines.push(
      "- If cough lasts more than 2 weeks or worsens, consult a doctor",
    );
    lines.push("");
    lines.push(
      "If you want to use a cough medicine, share the name and I can advise you.",
    );
  } else if (isNausea) {
    lines.push("**Nausea can be managed.** ");
    lines.push("");
    lines.push("Quick relief tips:");
    lines.push("- Sit or lie down comfortably");
    lines.push("- Sip ginger tea or lemon water slowly");
    lines.push("- Avoid strong smells and heavy food");
    lines.push("- Eat bland food (crackers, rice, toast)");
    lines.push("- If nausea persists or is severe, see a doctor");
    lines.push("");
    lines.push(
      "If you take a medicine for nausea, share the name and I'll help with usage.",
    );
  } else if (isAllergy) {
    lines.push("**Allergies can be itchy and uncomfortable.** ");
    lines.push("");
    lines.push("General steps:");
    lines.push("- Avoid the allergen if you know what it is");
    lines.push("- Wash affected area with cool water");
    lines.push("- Keep skin moisturized (but use non-irritating products)");
    lines.push("- Don't scratch - it makes it worse");
    lines.push(
      "- If rash spreads or causes swelling, see a doctor immediately",
    );
    lines.push("");
    lines.push(
      "If you want to use an allergy medicine, tell me the name and I'll guide you safely.",
    );
  } else if (isMissedDose) {
    lines.push("**About missed doses:**");
    lines.push("In general, if you miss a dose:");
    lines.push("- Take it as soon as you remember");
    lines.push(
      "- If it's almost time for your next dose (within 2-3 hours), skip the missed one",
    );
    lines.push("- Never take a double dose to make up for it");
    lines.push("");
    lines.push(
      "Once you tell me which medicine you're taking, I can give you more specific guidance.",
    );
  } else if (isSideEffect) {
    lines.push("**About side effects:**");
    lines.push(
      "Most medicines can cause side effects, and they vary by medicine. In general:",
    );
    lines.push(
      "- Common ones like mild nausea, headache, or dizziness often improve within 2-3 days",
    );
    lines.push(
      "- Serious side effects (severe rash, breathing trouble, chest pain) need immediate medical attention",
    );
    lines.push("- Always report unusual symptoms to your doctor or pharmacist");
    lines.push("");
    lines.push(
      "If you share the medicine name, I can tell you what side effects are most common for it.",
    );
  } else if (isDosage) {
    lines.push("**About dosage:**");
    lines.push("Dosage depends on many factors:");
    lines.push("- The specific medicine");
    lines.push("- Your age and weight");
    lines.push("- Your health condition");
    lines.push("- Other medicines you take");
    lines.push("");
    lines.push(
      "Always follow your prescription exactly. Never guess or adjust doses on your own.",
    );
    lines.push(
      "If you tell me the medicine name, I can give you general dosage guidance.",
    );
  } else if (isFood) {
    lines.push("**About food and medicines:**");
    lines.push(
      "Some medicines work better on an empty stomach, while others need food to prevent stomach upset.",
    );
    lines.push("In general:");
    lines.push("- Check your medicine label for instructions");
    lines.push("- If it causes nausea, taking with food may help");
    lines.push("- Ask your pharmacist if you're unsure");
    lines.push("");
    lines.push(
      "Share the medicine name, and I'll tell you exactly how to take it with food.",
    );
  } else if (isTiming) {
    lines.push("**About timing:**");
    lines.push("Taking medicine at the right time helps it work better:");
    lines.push(
      "- Most medicines work best when taken at the same time(s) each day",
    );
    lines.push(
      "- Space out doses evenly (e.g., every 8-12 hours for twice daily)",
    );
    lines.push("- Morning vs. evening timing depends on the medicine");
    lines.push("");
    lines.push(
      "Tell me the medicine name, and I'll help you figure out the best timing.",
    );
  } else if (isInteraction) {
    lines.push("**About medicine interactions:**");
    lines.push(
      "Some medicines don't work well together and can be risky. Always:",
    );
    lines.push(
      "- Tell your doctor and pharmacist about ALL medicines you take",
    );
    lines.push("- Include supplements, vitamins, and herbal products");
    lines.push("- Ask before adding any new medicine");
    lines.push("");
    lines.push(
      "If you share the medicines you're taking, I can check for potential interactions.",
    );
  } else if (isStorage) {
    lines.push("**About storing medicines:**");
    lines.push("Most medicines should be:");
    lines.push("- Kept in a cool, dry place at room temperature");
    lines.push("- Away from direct sunlight");
    lines.push("- Out of reach of children and pets");
    lines.push("- Some medicines need refrigeration (check the label)");
    lines.push("");
    lines.push(
      "If you tell me the specific medicine, I can confirm storage instructions.",
    );
  } else {
    // Generic response for other questions
    lines.push("I'm here to help with medicine questions!");
    lines.push("");
    lines.push("I can give you general guidance right now, and if you share:");
    lines.push("- **The medicine name** → I'll give specific, tailored advice");
    lines.push("- **Your age group** → Better dosage and safety info");
    lines.push("- **Other medicines you take** → Check for interactions");
    lines.push("");
    lines.push(
      "What specifically would you like to know? (dosage, side effects, food interactions, timing, missed doses, or something else?)",
    );
  }

  lines.push("");
  lines.push(`${DISCLAIMER}`);

  return res.json({
    success: true,
    found: false,
    answer: lines.join("\n"),
    confidenceLevel: "medium",
    confidenceIcon: "ℹ️ General guidance provided",
    message:
      "I can give general guidance, and if you share the medicine name, I'll tailor it exactly for you.",
  });
};

const detectLanguage = (question = "") => {
  if (/[\u0900-\u097F]/.test(question)) return "hinglish";
  if (/(kya|kaise|dawa|dawai|subah|shaam|raat|khana)/i.test(question))
    return "hinglish";
  return "english";
};

const isEmergency = (question = "") =>
  /(severe pain|chest pain|breathing difficulty|difficulty breathing|unconscious|overdose|allergic reaction|anaphylaxis)/i.test(
    question,
  );

const getConfidence = (medicine, context = {}) => {
  if (medicine?.prescriptionRequired || medicine?.isRx) return "medium";
  if (context?.ageGroup && context.ageGroup !== "adult") return "medium";
  return "high";
};

const confidenceToIcon = (level) => {
  if (level === "high") return "✅ Safe to follow";
  if (level === "medium") return "⚠️ Use with caution";
  return "❗ Consult a doctor";
};

const buildAnswer = (medicine, question, context = {}) => {
  const lines = [];
  const name = medicine?.name || "this medicine";
  const ageGroup = context?.ageGroup || "adult";
  const otherMeds = context?.otherMedicines || [];
  const languageInput = normalizeLanguage(context?.language || "");
  const language = languageInput || detectLanguage(question || "") || "english";

  // Get medicine context for RAG
  const medicineContext = buildMedicineContext(medicine);

  // Build conversational prompt using system prompt + RAG context
  const conversationalPrompt = `
${SYSTEM_PROMPT}

${medicineContext || "No specific medicine information available."}

PATIENT CONTEXT:
- Age Group: ${ageGroup}
- Other Medicines: ${otherMeds.length ? otherMeds.join(", ") : "None mentioned"}
- Preferred Language: ${language}

PATIENT QUESTION:
"${question}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now, as an experienced pharmacist, provide a helpful, accurate answer that:
1. Directly addresses the patient's question
2. Uses the medicine knowledge provided above
3. Includes relevant safety information naturally in conversation
4. Adjusts advice for age group (${ageGroup})
5. Keeps the tone warm and professional
6. Uses simple language anyone can understand
`;

  // Analyze the question type for structured response
  const qLower = (question || "").toLowerCase();
  const isMissedDose = /miss(ed)? dose|forget|skip(ped)?|bhul gaya/i.test(
    qLower,
  );
  const isSideEffect =
    /side effect|adverse|reaction|problem|allergy|nuksan/i.test(qLower);
  const isDosage =
    /dosage|dose|kitna|how much|how many|when to take|kab lena/i.test(qLower);
  const isFood = /food|khana|before|after|empty stomach|khali pet/i.test(
    qLower,
  );
  const isTiming =
    /timing|time|kab|when|subah|shaam|raat|morning|evening|night/i.test(qLower);
  const isStorage = /store|storage|rakhna|keep|temperature/i.test(qLower);
  const isPregnancy =
    /pregnan(t|cy)|breastfeed|nursing|garbh|feeding baby/i.test(qLower);

  // Build pharmacist-style conversational response
  lines.push(`**About ${name}** 💊\n`);

  if (medicine?.composition) {
    lines.push(`*Active ingredient: ${medicine.composition}*\n`);
  }

  // Answer based on question type - pharmacist style
  if (isMissedDose) {
    lines.push("I understand you missed a dose. Here's what I recommend:\n");
    lines.push(
      "✓ **If it's close to your next dose:** Skip the missed one and continue your regular schedule",
    );
    lines.push(
      "✓ **If you remember within a few hours:** Take it as soon as you remember",
    );
    lines.push(
      "✗ **Don't double up:** Never take two doses together to make up for a missed one\n",
    );
    lines.push(
      "It's generally safe to miss one dose occasionally, but try to take your medicines at the same time daily. Setting a phone reminder can help!",
    );
  } else if (isSideEffect) {
    lines.push("Let me help you understand the side effects:\n");
    if (medicine?.sideEffects) {
      lines.push(`**Common side effects:** ${medicine.sideEffects}\n`);
    }
    lines.push("Most side effects are mild and go away on their own. However:");
    lines.push(
      "⚠️ **Stop and see a doctor if you experience:** Severe rash, difficulty breathing, chest pain, or severe stomach pain",
    );
    lines.push(
      "💡 **Mild side effects:** Usually improve as your body adjusts (2-3 days)\n",
    );
    lines.push(
      "Keep taking the medicine unless side effects are severe. If you're concerned, call your doctor before stopping.",
    );
  } else if (isDosage || isTiming) {
    lines.push("About taking this medicine:\n");
    if (medicine?.strength) {
      lines.push(`**Typical strength:** ${medicine.strength}`);
    }
    lines.push(`**General guidance for ${ageGroup}s:**`);
    if (ageGroup === "child") {
      lines.push("- Pediatric dosing MUST be prescribed by a doctor");
      lines.push("- Never use adult doses for children");
      lines.push("- Weight-based dosing is common");
    } else if (ageGroup === "elderly") {
      lines.push("- Elderly patients often need lower doses");
      lines.push("- Take with water to help swallowing");
      lines.push("- Report any new symptoms promptly");
    } else {
      lines.push("- Follow the label or doctor's prescription exactly");
      lines.push("- Take at the same time(s) each day");
      lines.push("- Don't skip doses or stop early");
    }
    lines.push(
      "\n**Best practice:** Take it consistently - your body responds better with regular timing.",
    );
  } else if (isFood) {
    lines.push("About taking this with food:\n");
    lines.push("**General rule:** Check your medicine label - it will say:");
    lines.push("• 'Before food' = 30-60 minutes before eating");
    lines.push("• 'After food' = Right after your meal");
    lines.push("• 'With food' = Take while eating");
    lines.push("• 'Empty stomach' = 2 hours after eating\n");
    if (
      medicine?.precautions &&
      /food|meal|stomach/i.test(medicine.precautions)
    ) {
      lines.push(`**For ${name}:** ${medicine.precautions}`);
    } else {
      lines.push(
        "If your label doesn't specify, it's usually safe to take with food to prevent stomach upset.",
      );
    }
  } else if (isStorage) {
    lines.push("Storage instructions:\n");
    if (medicine?.storage) {
      lines.push(`**For ${name}:** ${medicine.storage}\n`);
    }
    lines.push("**General storage tips:**");
    lines.push("✓ Cool, dry place (not bathroom - too humid!)");
    lines.push("✓ Away from direct sunlight");
    lines.push("✓ Keep in original container with label");
    lines.push("✓ Out of reach of children and pets");
    lines.push("✗ Don't store near heat sources\n");
    lines.push(
      "*Most medicines stay good for 2-3 years if stored properly. Check expiry dates regularly!*",
    );
  } else if (isPregnancy) {
    lines.push("⚠️ **Important: Pregnancy & Breastfeeding**\n");
    lines.push(
      "Many medicines can affect pregnancy or pass into breast milk. **Please don't take any medicine without consulting your obstetrician or doctor first.**",
    );
    lines.push("\nThey'll consider:");
    lines.push("• Your trimester (if pregnant)");
    lines.push("• Benefits vs. risks to baby");
    lines.push("• Safer alternatives if needed\n");
    lines.push(
      "Your baby's safety comes first - always check with your doctor!",
    );
  } else {
    // General information
    lines.push("Here's what you should know:\n");
    if (medicine?.uses) {
      lines.push(`**Used for:** ${medicine.uses}\n`);
    }
    lines.push("**How to use safely:**");
    lines.push("• Follow your doctor's or pharmacist's instructions");
    lines.push("• Read the package insert");
    lines.push("• Take at regular times");
    lines.push("• Complete the full course (don't stop early)\n");

    if (medicine?.precautions) {
      lines.push(`**Precautions:** ${medicine.precautions}\n`);
    }
  }

  // Handle drug interactions if other medicines mentioned
  if (otherMeds.length > 0) {
    lines.push("\n**About interactions:**");
    lines.push(`You mentioned taking: ${otherMeds.join(", ")}`);
    lines.push("\n⚠️ Some medicines don't work well together. I recommend:");
    lines.push("• Ask your pharmacist to check for interactions");
    lines.push(
      "• Take different medicines spaced apart (unless advised otherwise)",
    );
    lines.push("• Keep an updated list of all your medicines");
  }

  // Age-specific final note
  if (ageGroup === "child") {
    lines.push(
      "\n👶 **For children:** Always use the exact dose prescribed by the pediatrician. Never estimate!",
    );
  } else if (ageGroup === "elderly") {
    lines.push(
      "\n👴 **For elderly patients:** Watch for dizziness, confusion, or falls. Report any new symptoms to your doctor.",
    );
  }

  // Prescription warning
  if (medicine?.prescriptionRequired || medicine?.isRx) {
    lines.push(
      "\n🔒 **Note:** This is a prescription medicine - use only under medical supervision.",
    );
  }

  const confidenceLevel = getConfidence(medicine, context);
  const confidenceIcon = confidenceToIcon(confidenceLevel);

  lines.push(`\n${confidenceIcon}`);
  lines.push(`\n*${DISCLAIMER}*`);

  if (language === "hinglish") {
    lines.push(
      `\nKoi bhi confusion ho to pharmacist ya doctor se zaroor puchein. 🙏`,
    );
  } else {
    lines.push(`\nIf you have any other questions, I'm here to help! 😊`);
  }

  const medicineCard = {
    medicine_name: name,
    timing:
      isDosage || isTiming
        ? "As prescribed - same time daily"
        : "As prescribed",
    food_rule: isFood ? "Check label - with/without food" : "As on label",
    duration: "Complete the full course as prescribed",
    age_suitability:
      ageGroup === "child"
        ? "Children (pediatrician approval required)"
        : ageGroup === "elderly"
          ? "Elderly (may need dose adjustment)"
          : "Adults",
    key_warning:
      medicine?.prescriptionRequired || medicine?.isRx
        ? "⚠️ Prescription medicine - use under medical supervision"
        : "Do not exceed recommended dose",
    confidence_level: confidenceLevel,
  };

  return {
    answer: lines.join("\n"),
    confidenceLevel,
    confidenceIcon,
    medicineCard,
    interactionWarning: Boolean(otherMeds.length),
  };
};

export const answerMedicineQuestion = async (req, res, next) => {
  try {
    const { medicineName, question, context } = req.body || {};

    // Allow questions even without medicine name - give general guidance first
    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Please ask your question.",
      });
    }

    const trimmed = String(medicineName || "").trim();

    const exactRegex = new RegExp(`^${escapeRegex(trimmed)}$`, "i");
    const partialRegex = new RegExp(escapeRegex(trimmed), "i");

    if (isEmergency(question)) {
      return res.json({
        success: true,
        found: false,
        emergency: true,
        answer: `${EMERGENCY_MESSAGE}\n\nPlease seek immediate help. Don't wait. Call an ambulance or go to the nearest emergency room.`,
        confidenceLevel: "low",
        confidenceIcon: "❗ Seek emergency care",
      });
    }

    // If no medicine name provided, give general guidance
    if (!trimmed) {
      return generateGeneralAnswer(question, context, res);
    }

    const exactMatch = await Product.findOne({ name: exactRegex }).lean();
    const medicine =
      exactMatch || (await Product.findOne({ name: partialRegex }).lean());

    if (!medicine) {
      return res.status(404).json({
        success: false,
        found: false,
        message: `I couldn't find specific information for "${trimmed}" in our database, but I can still help with general guidance.`,
        answer: `I don't have detailed information about **${trimmed}** in my database, but I can give you general guidance.\n\nFor specific details about this medicine, please:\n- Check the package insert\n- Ask your pharmacist or doctor\n- Share the medicine name, and I'll provide tailored advice if it's in our database\n\n${DISCLAIMER}`,
        confidenceLevel: "low",
        confidenceIcon: "⚠️ Consult your pharmacist",
      });
    }

    const {
      answer,
      confidenceLevel,
      confidenceIcon,
      medicineCard,
      interactionWarning,
    } = buildAnswer(medicine, question, context);

    return res.json({
      success: true,
      found: true,
      medicine: {
        id: medicine._id,
        name: medicine.name,
        composition: medicine.composition,
        strength: medicine.strength,
        manufacturer: medicine.manufacturer,
        prescriptionRequired: medicine.prescriptionRequired,
        isRx: medicine.isRx,
      },
      answer,
      confidenceLevel,
      confidenceIcon,
      medicineCard,
      interactionWarning,
      showPharmacistCTA: confidenceLevel !== "high",
    });
  } catch (error) {
    return next(error);
  }
};
