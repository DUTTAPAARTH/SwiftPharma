import { checkInteractions } from "../utils/medicalMCP.js";

export const checkDrugInteractions = async (req, res) => {
  try {
    const names = Array.isArray(req.body?.medicineNames)
      ? req.body.medicineNames
      : [];

    const cleaned = names
      .map((name) => String(name || "").trim())
      .filter(Boolean);

    if (cleaned.length < 2) {
      return res.json({
        success: true,
        warnings: [],
        message: "At least two medicines are required to check interactions.",
      });
    }

    const warnings = await checkInteractions(cleaned);

    return res.json({
      success: true,
      warnings,
      count: warnings.length,
    });
  } catch (error) {
    console.error("checkDrugInteractions error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check medicine interactions",
    });
  }
};
