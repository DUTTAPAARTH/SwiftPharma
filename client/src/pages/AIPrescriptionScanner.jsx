import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { scanPrescription } from "../services/aiScanService";
import { fetchLatestPrescriptionStatus } from "../services/prescriptionService";

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
  approved: "text-emerald-200 border-emerald-400/30 bg-emerald-500/10",
};

const AIPrescriptionScanner = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [stage, setStage] = useState("upload");

  const stageLabel = useMemo(() => {
    if (stage === "upload") return "Stage 1: Upload";
    if (stage === "reviewing") return "Stage 2: AI Reviewing";
    if (stage === "awaiting_pharmacist") return "Stage 3A: Awaiting Pharmacist";
    if (stage === "ai_rejected") return "Stage 3B: AI Rejected";
    if (stage === "rejected") return "Stage 4: Pharmacist Rejected";
    if (stage === "approved") return "Stage 4: Pharmacist Approved";
    return "Prescription Verification";
  }, [stage]);

  useEffect(() => {
    if (stage !== "awaiting_pharmacist") return undefined;

    let active = true;
    const poll = async () => {
      try {
        const { data } = await fetchLatestPrescriptionStatus();
        if (!active || !data?.prescription) return;

        if (data.prescription.status === "approved") {
          setResult((prev) => ({
            ...prev,
            latestPrescription: data.prescription,
          }));
          setStage("approved");
        } else if (data.prescription.status === "rejected") {
          setResult((prev) => ({
            ...prev,
            latestPrescription: data.prescription,
          }));
          setStage("rejected");
        }
      } catch (pollError) {
        // Keep silent to avoid noisy UI while polling.
      }
    };

    poll();
    const interval = setInterval(poll, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [stage]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError("");
    setResult(null);
    setStage("upload");
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

      if (data.status === "ai_rejected") {
        setStage("ai_rejected");
      } else if (data.status === "rejected") {
        setStage("rejected");
      } else if (data.status === "awaiting_pharmacist") {
        setStage("awaiting_pharmacist");
      } else if (data.status === "approved") {
        setStage("approved");
      } else {
        setStage("awaiting_pharmacist");
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
              {stage === "rejected" && "Rejected by pharmacist"}
              {stage === "approved" && "Approved"}
            </span>
          </div>

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

          {(stage === "ai_rejected" || stage === "rejected") && (
            <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-7 space-y-5">
              <h2 className="text-2xl font-black text-red-100">
                {stage === "rejected"
                  ? "Prescription Rejected by Pharmacist"
                  : "Prescription Rejected by AI"}
              </h2>
              <p className="text-red-100/90 text-sm">
                {result?.latestPrescription?.pharmacistNotes ||
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

          {stage === "approved" && (
            <div className="rounded-3xl border border-emerald-400/35 bg-emerald-500/10 p-8 text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-emerald-200">
                verified
              </span>
              <h2 className="text-3xl font-black text-emerald-100">
                Your prescription is verified and approved!
              </h2>
              <p className="text-emerald-100/90">
                You can now order your medicines.
              </p>
              <button
                type="button"
                onClick={() => navigate("/categories")}
                className="rounded-2xl px-8 py-3 bg-emerald-400 text-slate-900 font-black hover:bg-emerald-300"
              >
                Shop Now
              </button>
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
