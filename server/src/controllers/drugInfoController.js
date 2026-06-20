import { getDrugDetails, searchDrug } from "../utils/medicalMCP.js";

const DRUG_INFO_TTL_MS = Number(
  process.env.DRUG_INFO_CACHE_TTL_MS || 24 * 60 * 60 * 1000,
);
const drugInfoCache = new Map();

const getCached = (key) => {
  const hit = drugInfoCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    drugInfoCache.delete(key);
    return null;
  }
  return hit.value;
};

const setCached = (key, value) => {
  drugInfoCache.set(key, {
    value,
    expiresAt: Date.now() + DRUG_INFO_TTL_MS,
  });
};

const sanitizeList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(/[.;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
};

export const getDrugInfoByName = async (req, res) => {
  try {
    const medicineName = String(req.params.medicineName || "").trim();
    if (!medicineName) {
      return res.status(400).json({
        success: false,
        message: "medicineName is required",
      });
    }

    const cacheKey = medicineName.toLowerCase();
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ success: true, cached: true, ...cached });
    }

    const search = await searchDrug(medicineName, 5);
    const details = await getDrugDetails(medicineName);

    if (!search?.primary && !details) {
      return res.status(404).json({
        success: false,
        message: "Drug not found in FDA database",
      });
    }

    const primary = details || search?.primary || {};

    const payload = {
      medicineName,
      standardizedName:
        search?.primary?.standardizedName ||
        primary.standardizedName ||
        medicineName,
      genericName: primary.genericName || null,
      brandNames: search?.primary?.brandNames || primary.brandNames || [],
      manufacturer: primary.manufacturer || null,
      dosageForms: sanitizeList(primary.dosageForm || primary.route),
      indications: sanitizeList(primary.indications),
      contraindications: sanitizeList(primary.contraindications),
      sideEffects: sanitizeList(primary.sideEffects),
      warnings: sanitizeList(primary.warnings),
      source: {
        provider: "FDA + RxNorm",
        ndc: primary.ndc || null,
      },
    };

    setCached(cacheKey, payload);
    return res.json({ success: true, cached: false, ...payload });
  } catch (error) {
    console.error("getDrugInfoByName error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch drug information",
    });
  }
};

