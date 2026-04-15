import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "../hooks/useCart";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { scanPrescription } from "../services/aiScanService";
import { fetchPrescriptionStatusById } from "../services/prescriptionService";
import { fetchProducts } from "../services/productService";
import { useEmergencySocket } from "../hooks/useEmergencySocket";

const CHECKLIST = [
  "Doctor's name and signature",
  "Doctor's MCI/State registration number",
  "Patient's name",
  "Date of prescription",
  "Medicine name, dosage, and quantity",
];

const AI_CHECKS = [
  { label: "Doctor credentials", state: "done" },
  { label: "Patient information", state: "done" },
  { label: "Checking prescription date", state: "running" },
  { label: "Validating medicine details", state: "running" },
];

const statusTone = {
  awaiting_pharmacist: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  ai_rejected: "text-red-200 border-red-400/30 bg-red-500/10",
  rejected: "text-red-200 border-red-400/30 bg-red-500/10",
  expired: "text-orange-200 border-orange-400/30 bg-orange-500/10",
  approved: "text-emerald-200 border-emerald-400/30 bg-emerald-500/10",
};

const toSlug = (value) =>
  String(value || "medicine")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const hashString = (value) => {
  const input = String(value || "");
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const deterministicTestPrice = (seed, min = 60, max = 399) => {
  const range = max - min + 1;
  const value = hashString(seed) % range;
  return min + value;
};

const isMongoObjectId = (value) =>
  /^[a-fA-F0-9]{24}$/.test(String(value || "").trim());

const normalizeMedicineName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\b(tab|tablet|cap|capsule|inj|injection|syp|syrup)\.?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const pickBestCatalogMatch = (sourceName, candidates = []) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const normalizedSource = normalizeMedicineName(sourceName);
  if (!normalizedSource) return candidates[0] || null;

  const exact = candidates.find(
    (candidate) => normalizeMedicineName(candidate?.name) === normalizedSource,
  );
  if (exact) return exact;

  const includesMatch = candidates.find((candidate) => {
    const target = normalizeMedicineName(candidate?.name);
    return (
      target.includes(normalizedSource) || normalizedSource.includes(target)
    );
  });
  if (includesMatch) return includesMatch;

  return candidates[0] || null;
};

const toCartReadyMedicine = (medicine, index) => {
  const seedBase = [medicine?.name, medicine?.dosage, medicine?.quantity]
    .filter(Boolean)
    .join("|") || `medicine-${index}`;

  const existingPrice = Number(medicine?.price || medicine?.mrp || 0);
  const safePrice = Number.isFinite(existingPrice) && existingPrice > 0
    ? Math.round(existingPrice)
    : deterministicTestPrice(seedBase);

  const existingMrp = Number(medicine?.mrp || 0);
  const safeMrp = Number.isFinite(existingMrp) && existingMrp > 0
    ? Math.round(existingMrp)
    : Math.max(safePrice + 10, deterministicTestPrice(`${seedBase}|mrp`, 80, 459));

  const keyBase =
    String(medicine?.productId || medicine?.id || medicine?._id || "").trim() ||
    `${toSlug(medicine?.name)}-${index}-${Date.now()}`;

  return {
    ...medicine,
    checked: true,
    productId: keyBase,
    id: keyBase,
    price: safePrice,
    mrp: safeMrp,
    requiresRx: true,
    isRx: true,
  };
};

const AIPrescriptionScanner = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { addItem } = useCart();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [stage, setStage] = useState("upload");
  const [currentPrescriptionId, setCurrentPrescriptionId] = useState(null);
  const [socketRefreshTick, setSocketRefreshTick] = useState(0);
  // Confirmation step state
  const [confirming, setConfirming] = useState(false);
  const [selectedMeds, setSelectedMeds] = useState([]);
  const catalogMatchCacheRef = useRef(new Map());

  const findCatalogProduct = async (medicineName) => {
    const normalizedKey = normalizeMedicineName(medicineName);
    if (!normalizedKey) return null;

    if (catalogMatchCacheRef.current.has(normalizedKey)) {
      return catalogMatchCacheRef.current.get(normalizedKey);
    }

    try {
      const products = await fetchProducts({ search: medicineName, limit: 20 });
      const match = pickBestCatalogMatch(medicineName, products);
      catalogMatchCacheRef.current.set(normalizedKey, match || null);
      return match || null;
    } catch {
      catalogMatchCacheRef.current.set(normalizedKey, null);
      return null;
    }
  };

  const prepareConfirmedMedicines = async (medicines = []) => {
    const prepared = await Promise.all(
      medicines.map(async (medicine, index) => {
        const cartReady = toCartReadyMedicine(medicine, index);
        if (isMongoObjectId(cartReady.productId || cartReady.id)) {
          const validId = String(cartReady.productId || cartReady.id);
          return {
            ...cartReady,
            productId: validId,
            id: validId,
            notInCatalog: false,
          };
        }

        const match = await findCatalogProduct(medicine?.name || cartReady.name);
        if (!match?._id) {
          return {
            ...cartReady,
            notInCatalog: true,
          };
        }

        const matchedId = String(match._id);
        const matchedPrice = Number(match.price || 0);
        const matchedMrp = Number(match.mrp || match.price || 0);

        return {
          ...cartReady,
          id: matchedId,
          productId: matchedId,
          name: match.name || cartReady.name,
          price: matchedPrice > 0 ? matchedPrice : cartReady.price,
          mrp: matchedMrp > 0 ? matchedMrp : cartReady.mrp,
          image: match.image || cartReady.image,
          manufacturer: match.manufacturer || cartReady.manufacturer,
          composition: match.composition || cartReady.composition,
          strength: match.strength || cartReady.strength,
          notInCatalog: false,
        };
      }),
    );

    return prepared;
  };

  const toStageFromStatus = (status) => {
    const normalized = String(status || "")
      .trim()
      .toLowerCase();
    if (normalized === "ai_reviewing") return "reviewing";
    if (normalized === "awaiting_pharmacist") return "awaiting_pharmacist";
    if (normalized === "ai_rejected") return "ai_rejected";
    if (normalized === "rejected") return "rejected";
    if (normalized === "expired") return "expired";
    if (normalized === "approved") return "approved";
    return "upload";
  };

  const stageLabel = useMemo(() => {
    if (stage === "upload") return "Stage 1: Upload";
    if (stage === "reviewing") return "Stage 2: AI Reviewing";
    if (stage === "awaiting_pharmacist") return "Stage 3A: Awaiting Pharmacist";
    if (stage === "ai_rejected") return "Stage 3B: AI Rejected";
    if (stage === "expired") return "Stage 3C: Prescription Expired";
    if (stage === "rejected") return "Stage 4: Pharmacist Rejected";
    if (stage === "approved") return "Stage 4: Pharmacist Approved";
    return "Prescription Verification";
  }, [stage]);

  useEmergencySocket({
    onPrescriptionUpdate: (payload) => {
      if (!currentPrescriptionId) return;
      const payloadPrescriptionId = payload?.prescriptionId;
      if (
        payloadPrescriptionId &&
        String(payloadPrescriptionId) !== String(currentPrescriptionId)
      ) {
        return;
      }

      setSocketRefreshTick((value) => value + 1);
    },
  });

  useEffect(() => {
    if (!currentPrescriptionId) return undefined;
    if (!["reviewing", "awaiting_pharmacist"].includes(stage)) {
      return undefined;
    }

    let active = true;
    const poll = async () => {
      try {
        const { data } = await fetchPrescriptionStatusById(
          currentPrescriptionId,
        );
        if (!active || !data?.prescription) return;

        const nextStatus = String(data.prescription.status || "").toLowerCase();

        setResult((prev) => ({
          ...prev,
          latestPrescription: data.prescription,
          status: data.prescription.status,
        }));

        const nextStage = toStageFromStatus(nextStatus);

        if (nextStage === "approved") {
          const extracted = Array.isArray(data.prescription.aiExtractedMedicines)
            ? data.prescription.aiExtractedMedicines
            : [];
          const prepared = await prepareConfirmedMedicines(extracted);
          if (!active) return;
          setSelectedMeds(prepared);
          setConfirming(true);
          setStage("confirm");
          return;
        }

        if (nextStage !== "upload") {
          setStage(nextStage);
        }
      } catch (pollError) {
        // Keep silent to avoid noisy UI while polling.
      }
    };

    poll();
    const interval = setInterval(poll, stage === "reviewing" ? 4000 : 8000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [stage, currentPrescriptionId, socketRefreshTick]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError("");
    setResult(null);
    setCurrentPrescriptionId(null);
    setStage("upload");
    setConfirming(false);
    setSelectedMeds([]);
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please upload JPG, PNG, or PDF files only.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB.");
      return;
    }

    setFile(selectedFile);
    setPreview(
      selectedFile.type === "application/pdf"
        ? null
        : URL.createObjectURL(selectedFile),
    );
    setError("");
    setResult(null);
    setStage("upload");
  };

  const handleScan = async () => {
    if (!file) {
      setError("Please select a prescription file first.");
      return;
    }

    setLoading(true);
    setError("");
    setStage("reviewing");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const { data } = await scanPrescription(formData);
      if (!data?.success) {
        throw new Error(data?.message || "Validation failed");
      }

      setResult(data);
      setCurrentPrescriptionId(data?.prescriptionId || null);

      const initialStage = toStageFromStatus(data.status);

      if (initialStage === "approved") {
        // Confirmation step: show confirmation UI instead of adding to cart
        const prepared = await prepareConfirmedMedicines(
          Array.isArray(data.medicines) ? data.medicines : [],
        );
        setSelectedMeds(prepared);
        setConfirming(true);
        setStage("confirm");
      } else if (initialStage !== "upload") {
        setStage(initialStage);
      } else {
        setStage("upload");
        setError(data?.message || "Unexpected prescription status returned.");
      }
    } catch (scanError) {
      setStage("upload");
      setError(
        scanError?.response?.data?.message ||
          scanError.message ||
          "Failed to scan prescription. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const currentStatusTone =
    statusTone[stage] || "text-slate-200 border-slate-600 bg-slate-800/60";

  // Select all/deselect all handlers
  const handleSelectAll = () => {
    setSelectedMeds((meds) => meds.map((med) => ({ ...med, checked: true })));
  };
  const handleDeselectAll = () => {
    setSelectedMeds((meds) => meds.map((med) => ({ ...med, checked: false })));
  };
  const handleToggleMed = (idx) => {
    setSelectedMeds((meds) =>
      meds.map((med, i) =>
        i === idx ? { ...med, checked: !med.checked } : med,
      ),
    );
  };

  // Add selected medicines to cart
  const handleAddToCart = () => {
    const medsToAdd = selectedMeds.filter((med) => med.checked);
    medsToAdd.forEach((med) => addItem(med, 1));
    toast.success(`Added ${medsToAdd.length} medicine(s) to cart!`);
    setTimeout(() => navigate("/cart"), 1500);
  };

  // Skip confirmation
  const handleSkip = () => {
    navigate("/categories");
  };

  return (
    <div className="min-h-screen bg-[#081123] text-slate-100">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-32 space-y-8">
        <section className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 text-xs font-bold tracking-wide">
            <span className="material-symbols-outlined text-sm">
              verified_user
            </span>
            Hard Prescription Verification
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            Prescription Verification Pipeline
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Rx medicines are blocked until your prescription is AI-validated and
            pharmacist-approved.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/65 backdrop-blur p-6 md:p-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <p className="font-semibold text-cyan-300">{stageLabel}</p>
            <span
              className={`px-3 py-1 rounded-full border text-xs font-bold ${currentStatusTone}`}
            >
              {stage === "upload" && "Waiting for upload"}
              {stage === "reviewing" && "AI reviewing"}
              {stage === "awaiting_pharmacist" &&
                "Awaiting pharmacist approval"}
              {stage === "ai_rejected" && "AI rejected"}
              {stage === "expired" && "Prescription expired"}
              {stage === "rejected" && "Rejected by pharmacist"}
              {stage === "approved" && "Approved"}
              {stage === "confirm" && "Ready to confirm medicines"}
            </span>
          </div>

          {currentPrescriptionId ? (
            <p className="text-xs text-slate-400">
              Tracking prescription: #
              {String(currentPrescriptionId).slice(-8).toUpperCase()}
            </p>
          ) : null}

          {stage === "upload" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div
                className="rounded-3xl border-2 border-dashed border-cyan-400/45 bg-cyan-500/5 p-8 text-center cursor-pointer hover:border-cyan-300 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFileSelect(event.dataTransfer.files[0]);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={(event) =>
                    handleFileSelect(event.target.files?.[0])
                  }
                />

                <div className="mx-auto size-16 rounded-2xl bg-cyan-500/15 border border-cyan-300/30 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-cyan-200 text-3xl">
                    upload_file
                  </span>
                </div>
                <p className="text-xl font-black text-white">
                  Upload Prescription
                </p>
                <p className="text-slate-300 mt-2 text-sm">
                  Upload a prescription from a registered doctor. Must include:
                  Doctor name, registration number, patient name, date, and
                  medicine details.
                </p>
                <p className="text-xs text-slate-400 mt-4">
                  Accepted formats: JPG, PNG, PDF (Max 10MB)
                </p>

                {file && (
                  <div className="mt-5 rounded-xl bg-slate-800/80 border border-slate-700 p-3 text-left text-sm">
                    <p className="font-semibold text-slate-100">
                      Selected: {file.name}
                    </p>
                    {preview && (
                      <img
                        src={preview}
                        alt="Prescription preview"
                        className="mt-3 w-full h-44 object-cover rounded-lg border border-slate-700"
                      />
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleScan();
                  }}
                  disabled={loading || !file}
                  className="mt-6 w-full rounded-2xl py-3 font-bold bg-cyan-400 text-slate-900 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Verification
                </button>
              </div>

              <div className="rounded-3xl border border-slate-700 bg-slate-950/50 p-6">
                <p className="text-sm font-bold text-slate-200 mb-4">
                  Requirements Checklist
                </p>
                <div className="space-y-3">
                  {CHECKLIST.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 text-sm text-slate-300"
                    >
                      <span className="material-symbols-outlined text-slate-500 text-base">
                        check_box_outline_blank
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stage === "reviewing" && (
            <div className="rounded-3xl border border-cyan-400/30 bg-cyan-500/5 p-7 space-y-5">
              <div className="flex items-center gap-4">
                <div className="relative size-14 rounded-2xl bg-cyan-400/20 border border-cyan-300/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-300/30 to-transparent animate-pulse" />
                  <span className="material-symbols-outlined text-3xl text-cyan-200 absolute inset-0 m-auto w-fit h-fit">
                    document_scanner
                  </span>
                </div>
                <div>
                  <p className="text-xl font-black text-white">
                    AI is validating your prescription...
                  </p>
                  <p className="text-slate-300 text-sm">
                    Running strict checks before pharmacist queue.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {AI_CHECKS.map((check) => (
                  <div
                    key={check.label}
                    className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 flex items-center gap-2 text-sm"
                  >
                    <span className="material-symbols-outlined text-cyan-300 text-base">
                      {check.state === "done"
                        ? "check_circle"
                        : "progress_activity"}
                    </span>
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage === "awaiting_pharmacist" && (
            <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-7 space-y-4">
              <h2 className="text-2xl font-black text-emerald-200">
                Prescription looks good! Sending to pharmacist...
              </h2>
              <p className="text-emerald-100/90 text-sm">
                Awaiting pharmacist approval (est. 30 min). We will notify you
                when approved.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-emerald-300/20 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-widest text-emerald-200">
                    AI confidence
                  </p>
                  <p className="text-3xl font-black text-white">
                    {Math.round(result?.aiValidation?.confidenceScore || 0)}%
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-widest text-emerald-200">
                    Queue status
                  </p>
                  <p className="text-lg font-semibold text-white">
                    Awaiting pharmacist approval
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="font-semibold text-slate-100 mb-2">
                  Extracted medicines
                </p>
                <div className="space-y-2">
                  {(result?.medicines || []).map((med, index) => (
                    <div
                      key={`${med.name}-${index}`}
                      className="text-sm text-slate-300 flex justify-between gap-4"
                    >
                      <span>{med.name || "Unknown medicine"}</span>
                      <span className="text-slate-400">
                        {med.dosage || "As directed"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(stage === "ai_rejected" ||
            stage === "rejected" ||
            stage === "expired") && (
            <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-7 space-y-5">
              <h2 className="text-2xl font-black text-red-100">
                {stage === "rejected"
                  ? "Prescription Rejected by Pharmacist"
                  : stage === "expired"
                    ? "Prescription Expired"
                    : "Prescription Rejected by AI"}
              </h2>
              <p className="text-red-100/90 text-sm">
                {stage === "expired"
                  ? "This prescription appears older than 6 months. Please upload a current valid prescription."
                  : result?.latestPrescription?.pharmacistNotes ||
                    result?.aiValidation?.rejectionReason ||
                    "The uploaded prescription did not pass strict validation."}
              </p>

              {Array.isArray(result?.aiValidation?.flags) &&
                result.aiValidation.flags.length > 0 && (
                  <div className="rounded-2xl border border-red-400/20 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-widest text-red-200 mb-2">
                      Detected issues
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.aiValidation.flags.map((flag) => (
                        <span
                          key={flag}
                          className="px-2 py-1 rounded-full border border-red-300/30 text-xs text-red-100 bg-red-500/15"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              <div className="rounded-2xl border border-red-400/20 bg-black/20 p-4">
                <p className="font-semibold text-red-100 mb-2">
                  Need help? Common reasons for rejection:
                </p>
                <ul className="text-sm text-red-100/85 space-y-1 list-disc pl-5">
                  <li>Image too blurry, retake in good lighting</li>
                  <li>Missing doctor registration number</li>
                  <li>Prescription older than 6 months</li>
                  <li>Digital screenshot not accepted</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={reset}
                className="rounded-2xl px-6 py-3 bg-red-500 text-white font-bold hover:bg-red-400"
              >
                Upload New Prescription
              </button>
            </div>
          )}

          {/* Confirmation step UI */}
          {stage === "confirm" && (
            <div className="rounded-3xl border border-emerald-400/35 bg-emerald-500/10 p-8 space-y-6">
              <div className="mb-4">
                <div className="rounded-t-xl bg-emerald-700/80 px-4 py-2 text-center">
                  <h2 className="text-lg font-bold text-white">
                    AI found {selectedMeds.length} medicine
                    {selectedMeds.length !== 1 ? "s" : ""} in your prescription
                  </h2>
                  <p className="text-emerald-100 text-sm">
                    Review and select which to add to cart
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {selectedMeds.map((med, idx) => (
                  <div
                    key={med.name + idx}
                    className="flex items-center gap-4 bg-slate-900/80 rounded-xl p-3"
                  >
                    <input
                      type="checkbox"
                      checked={!!med.checked}
                      onChange={() => handleToggleMed(idx)}
                      className="accent-cyan-400 w-5 h-5"
                      disabled={med.notInCatalog}
                    />
                    <div className="flex-1">
                      <div className="font-bold text-white text-base">
                        {med.name}
                      </div>
                      {med.dosage && (
                        <div className="text-cyan-300 text-xs font-semibold">
                          {med.dosage}
                        </div>
                      )}
                      {med.quantity && (
                        <div className="text-slate-400 text-xs">
                          Qty: {med.quantity}
                        </div>
                      )}
                    </div>
                    {med.notInCatalog ? (
                      <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded">
                        Not in catalog
                      </span>
                    ) : (
                      <span className="text-emerald-200 text-xs font-bold">
                        ₹{med.price || med.mrp || "-"} In stock
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <button
                  type="button"
                  className="text-cyan-300 underline"
                  onClick={handleSelectAll}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="text-cyan-300 underline"
                  onClick={handleDeselectAll}
                >
                  Deselect All
                </button>
                <span className="text-cyan-400 ml-2 text-sm font-semibold">
                  {selectedMeds.filter((m) => m.checked).length} of{" "}
                  {selectedMeds.length} selected
                </span>
              </div>
              <div className="rounded-xl bg-amber-400/20 border border-amber-400/30 p-3 text-amber-200 text-sm font-semibold mt-4">
                These medicines will be added to your cart. Prescription
                medicines still require pharmacist approval before checkout.
              </div>
              <div className="flex flex-col md:flex-row gap-3 mt-6">
                <button
                  type="button"
                  className="flex-1 rounded-2xl py-3 font-bold bg-cyan-400 text-slate-900 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={selectedMeds.filter((m) => m.checked).length === 0}
                  onClick={handleAddToCart}
                >
                  Add {selectedMeds.filter((m) => m.checked).length} Medicine
                  {selectedMeds.filter((m) => m.checked).length !== 1
                    ? "s"
                    : ""}{" "}
                  to Cart
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-2xl py-3 font-bold bg-slate-700 text-white hover:bg-slate-600"
                  onClick={handleSkip}
                >
                  Skip — Add manually
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-200">
                error
              </span>
              <p className="text-sm text-red-100 flex-1">{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-100 hover:text-white"
              >
                <span className="material-symbols-outlined text-base">
                  close
                </span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap border-t border-slate-800 pt-4">
            <Link
              to="/prescription-status"
              className="text-cyan-300 hover:text-cyan-200 text-sm font-semibold"
            >
              View My Prescription Status
            </Link>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Reset Flow
            </button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AIPrescriptionScanner;
