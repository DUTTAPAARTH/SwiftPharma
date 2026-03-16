import {
  getDrugByNDC as mcpGetDrugByNDC,
  searchClinicalGuidelines as mcpSearchClinicalGuidelines,
  searchDrugs as mcpSearchDrugs,
  searchPubMedArticles as mcpSearchPubMedArticles,
  searchRxNormDrugs as mcpSearchRxNormDrugs,
} from "medical-mcp/build/utils.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_TTL_MS = Number(process.env.MEDICAL_MCP_CACHE_TTL_MS || DAY_MS);

const inMemoryCache = new Map();

const now = () => Date.now();

const cacheGet = (key) => {
  const hit = inMemoryCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < now()) {
    inMemoryCache.delete(key);
    return null;
  }
  return hit.value;
};

const cacheSet = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  inMemoryCache.set(key, {
    value,
    expiresAt: now() + ttlMs,
  });
};

const normalizeName = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toArray = (value) => (Array.isArray(value) ? value : []);

const firstArrayValue = (obj, key) => {
  const value = obj?.[key];
  if (Array.isArray(value) && value.length) {
    return value[0];
  }
  return null;
};

const parseDrugFromFDA = (raw) => {
  const openfda = raw?.openfda || {};
  return {
    ndc: firstArrayValue(openfda, "product_ndc"),
    genericName:
      firstArrayValue(openfda, "generic_name") ||
      firstArrayValue(openfda, "substance_name"),
    brandName: firstArrayValue(openfda, "brand_name"),
    brandNames: toArray(openfda.brand_name),
    manufacturer: firstArrayValue(openfda, "manufacturer_name"),
    dosageForm: firstArrayValue(openfda, "dosage_form"),
    route: firstArrayValue(openfda, "route"),
    indications: firstArrayValue(raw, "indications_and_usage"),
    contraindications: firstArrayValue(raw, "contraindications"),
    sideEffects: firstArrayValue(raw, "adverse_reactions"),
    dosageAndAdministration: firstArrayValue(raw, "dosage_and_administration"),
    warnings: firstArrayValue(raw, "warnings"),
    raw,
  };
};

const pickSeverity = (score) => {
  if (score >= 8) return "severe";
  if (score >= 5) return "moderate";
  return "mild";
};

const HIGH_RISK_INTERACTIONS = new Map([
  [
    "ibuprofen|warfarin",
    {
      severity: "severe",
      description:
        "Increased risk of serious gastrointestinal and systemic bleeding.",
      recommendation:
        "Avoid combination unless specifically advised and monitored by a physician.",
      source: "Known anticoagulant-NSAID interaction",
    },
  ],
  [
    "diclofenac|warfarin",
    {
      severity: "severe",
      description:
        "Diclofenac with warfarin can markedly increase bleeding risk.",
      recommendation:
        "Use safer alternatives and monitor INR closely if co-prescribed.",
      source: "Known anticoagulant-NSAID interaction",
    },
  ],
  [
    "aspirin|warfarin",
    {
      severity: "severe",
      description:
        "Dual antithrombotic effect can significantly increase major bleeding risk.",
      recommendation:
        "Only use together under cardiology/physician supervision.",
      source: "Known dual antithrombotic interaction",
    },
  ],
  [
    "ibuprofen|clopidogrel",
    {
      severity: "moderate",
      description:
        "Combined antiplatelet/NSAID effect may increase bleeding risk.",
      recommendation: "Use gastroprotection and monitor for bleeding symptoms.",
      source: "Known antiplatelet-NSAID interaction",
    },
  ],
  [
    "diclofenac|clopidogrel",
    {
      severity: "moderate",
      description: "May increase risk of GI bleeding and bruising.",
      recommendation:
        "Prefer lowest dose/shortest duration with medical supervision.",
      source: "Known antiplatelet-NSAID interaction",
    },
  ],
  [
    "ibuprofen|aspirin",
    {
      severity: "mild",
      description:
        "Ibuprofen may blunt aspirin antiplatelet effect depending on timing.",
      recommendation:
        "If both are needed, separate timing and confirm regimen with doctor.",
      source: "Known pharmacodynamic timing interaction",
    },
  ],
]);

const getPairKey = (a, b) => {
  const one = normalizeName(a);
  const two = normalizeName(b);
  return [one, two].sort().join("|");
};

const extractRxNormName = (entry) => {
  if (!entry) return null;
  return entry.name || entry.rxcuiName || entry.displayName || null;
};

const summarizeLiteratureInteraction = (articles = []) => {
  const text = articles
    .map((article) =>
      `${article?.title || ""} ${article?.abstract || ""}`.toLowerCase(),
    )
    .join(" ");

  let score = 0;
  if (/contraindicat|fatal|major bleeding|life-threatening|severe/.test(text))
    score += 8;
  if (/moderate|monitor|caution|risk increased/.test(text)) score += 5;
  if (/minor|mild|limited evidence/.test(text)) score += 2;

  return pickSeverity(score || 2);
};

export const initializeMedicalMCPClient = async () => {
  // Import side-effects already resolved by module import.
  // This function exists to make initialization explicit in app startup.
  return true;
};

export const searchDrug = async (query, limit = 5) => {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) {
    return {
      query: normalizedQuery,
      results: [],
      rxNorm: [],
      primary: null,
    };
  }

  const cacheKey = `drug:${normalizedQuery.toLowerCase()}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const [fdaResults, rxNormResults] = await Promise.all([
    mcpSearchDrugs(normalizedQuery, limit).catch(() => []),
    mcpSearchRxNormDrugs(normalizedQuery).catch(() => []),
  ]);

  const parsedFDA = toArray(fdaResults).map(parseDrugFromFDA);
  const parsedRxNorm = toArray(rxNormResults).map((entry) => ({
    id: entry.rxcui || entry.id || null,
    name: extractRxNormName(entry),
    tty: entry.tty || null,
    synonym: entry.synonym || null,
    raw: entry,
  }));

  const primary = parsedFDA[0]
    ? {
        ...parsedFDA[0],
        standardizedName:
          parsedRxNorm[0]?.name ||
          parsedFDA[0].genericName ||
          parsedFDA[0].brandName ||
          normalizedQuery,
      }
    : {
        ndc: null,
        genericName: null,
        brandName: null,
        brandNames: [],
        manufacturer: null,
        dosageForm: null,
        indications: null,
        contraindications: null,
        sideEffects: null,
        dosageAndAdministration: null,
        warnings: null,
        standardizedName: parsedRxNorm[0]?.name || normalizedQuery,
      };

  const payload = {
    query: normalizedQuery,
    results: parsedFDA,
    rxNorm: parsedRxNorm,
    primary,
  };

  cacheSet(cacheKey, payload);
  return payload;
};

export const getDrugDetails = async (medicineNameOrNdc) => {
  const input = String(medicineNameOrNdc || "").trim();
  if (!input) return null;

  const cacheKey = `details:${input.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const looksLikeNdc = /^\d{4,5}-\d{3,4}-\d{1,2}$|^\d{10,11}$/.test(input);
  let detailed = null;

  if (looksLikeNdc) {
    const raw = await mcpGetDrugByNDC(input).catch(() => null);
    if (raw) {
      detailed = parseDrugFromFDA(raw);
    }
  }

  if (!detailed) {
    const search = await searchDrug(input, 5);
    if (search?.primary?.ndc) {
      const raw = await mcpGetDrugByNDC(search.primary.ndc).catch(() => null);
      detailed = raw ? parseDrugFromFDA(raw) : search.primary;
      detailed.standardizedName = search.primary.standardizedName;
    } else {
      detailed = search?.primary || null;
    }
  }

  if (detailed) {
    cacheSet(cacheKey, detailed);
  }

  return detailed;
};

export const searchLiterature = async (query, maxResults = 3) => {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) return [];

  const cacheKey = `lit:${normalizedQuery.toLowerCase()}:${maxResults}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const raw = await mcpSearchPubMedArticles(normalizedQuery, maxResults).catch(
    () => [],
  );
  const normalized = toArray(raw).map((entry) => ({
    pmid: entry.pmid || entry.id || null,
    title: entry.title || "Untitled Article",
    journal: entry.journal || "PubMed",
    year: entry.year || entry.pubDate || null,
    abstract: entry.abstract || null,
    url:
      entry.url ||
      (entry.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${entry.pmid}/` : null),
    raw: entry,
  }));

  cacheSet(
    cacheKey,
    normalized,
    Number(process.env.MEDICAL_MCP_LIT_TTL_MS || 60 * 60 * 1000),
  );
  return normalized;
};

export const searchGuidelines = async (query, organization, limit = 3) => {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) return [];

  const cacheKey = `guide:${normalizedQuery.toLowerCase()}:${String(organization || "any").toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const raw = await mcpSearchClinicalGuidelines(
    normalizedQuery,
    organization,
  ).catch(() => []);
  const normalized = toArray(raw)
    .slice(0, limit)
    .map((entry) => ({
      title: entry.title || entry.guideline || "Clinical Guideline",
      organization:
        entry.organization || entry.source || "Medical Organization",
      year: entry.year || null,
      summary: entry.summary || entry.snippet || null,
      url: entry.url || null,
      raw: entry,
    }));

  cacheSet(
    cacheKey,
    normalized,
    Number(process.env.MEDICAL_MCP_GUIDELINES_TTL_MS || 7 * DAY_MS),
  );
  return normalized;
};

export const checkInteractions = async (medicineNames = []) => {
  const names = toArray(medicineNames)
    .map((name) => String(name || "").trim())
    .filter(Boolean);

  if (names.length < 2) {
    return [];
  }

  const canonical = await Promise.all(
    names.map(async (name) => {
      const found = await searchDrug(name, 3);
      return {
        original: name,
        canonical:
          found?.primary?.standardizedName ||
          found?.primary?.genericName ||
          name,
      };
    }),
  );

  const warnings = [];

  for (let i = 0; i < canonical.length; i += 1) {
    for (let j = i + 1; j < canonical.length; j += 1) {
      const a = canonical[i];
      const b = canonical[j];
      const pairKey = getPairKey(a.canonical, b.canonical);
      const directCanonical = `${normalizeName(a.canonical)}|${normalizeName(b.canonical)}`;
      const reverseCanonical = `${normalizeName(b.canonical)}|${normalizeName(a.canonical)}`;
      const directOriginal = `${normalizeName(a.original)}|${normalizeName(b.original)}`;
      const reverseOriginal = `${normalizeName(b.original)}|${normalizeName(a.original)}`;

      const known =
        HIGH_RISK_INTERACTIONS.get(pairKey) ||
        HIGH_RISK_INTERACTIONS.get(directCanonical) ||
        HIGH_RISK_INTERACTIONS.get(reverseCanonical) ||
        HIGH_RISK_INTERACTIONS.get(directOriginal) ||
        HIGH_RISK_INTERACTIONS.get(reverseOriginal);
      if (known) {
        warnings.push({
          medicines: [a.original, b.original],
          severity: known.severity,
          description: known.description,
          recommendation: known.recommendation,
          source: known.source,
        });
        continue;
      }

      const literature = await searchLiterature(
        `${a.canonical} ${b.canonical} drug interaction`,
        3,
      );
      if (literature.length) {
        const severity = summarizeLiteratureInteraction(literature);
        const first = literature[0];
        warnings.push({
          medicines: [a.original, b.original],
          severity,
          description:
            first?.title ||
            "Potential pharmacological interaction reported in medical literature.",
          recommendation:
            severity === "severe"
              ? "Avoid this combination unless your clinician confirms it is necessary."
              : severity === "moderate"
                ? "Use with caution and monitor for side effects."
                : "Review with your pharmacist if symptoms appear.",
          source: first?.pmid
            ? `PubMed PMID:${first.pmid}`
            : "PubMed literature",
        });
      }
    }
  }

  const severityRank = { severe: 3, moderate: 2, mild: 1 };
  warnings.sort(
    (a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0),
  );

  return warnings;
};
