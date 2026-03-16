import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { fetchUserPrescriptions } from "../services/prescriptionService";

const STATUS_STYLES = {
  pending: "bg-slate-500/20 text-slate-200 border-slate-400/40",
  ai_reviewing: "bg-blue-500/20 text-blue-100 border-blue-400/40 animate-pulse",
  awaiting_pharmacist: "bg-amber-500/20 text-amber-100 border-amber-400/40",
  approved: "bg-emerald-500/20 text-emerald-100 border-emerald-400/40",
  ai_rejected: "bg-red-500/20 text-red-100 border-red-400/40",
  rejected: "bg-red-500/20 text-red-100 border-red-400/40",
  expired: "bg-zinc-700/50 text-zinc-200 border-zinc-500/50",
};

const STATUS_LABELS = {
  pending: "Pending Review",
  ai_reviewing: "AI Reviewing",
  awaiting_pharmacist: "Awaiting Pharmacist Approval",
  approved: "Approved",
  ai_rejected: "Rejected by AI",
  rejected: "Rejected by Pharmacist",
  expired: "Expired",
};

const toPercent = (value) => {
  const num = Number(value || 0);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(100, num));
};

const PrescriptionStatus = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await fetchUserPrescriptions();
        if (!active) return;
        setPrescriptions(Array.isArray(data) ? data : []);
      } catch (loadError) {
        if (!active) return;
        setError("Failed to load your prescriptions.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#081123] text-slate-100">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-32 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-cyan-300 text-xs uppercase font-bold tracking-widest">
              Verification
            </p>
            <h1 className="text-4xl font-black text-white">My Prescriptions</h1>
          </div>

          <Link
            to="/ai-prescription"
            className="rounded-xl bg-cyan-400 text-slate-900 px-5 py-2.5 font-bold hover:bg-cyan-300"
          >
            Upload New Prescription
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-8 text-center">
            <span className="material-symbols-outlined animate-spin text-cyan-300">
              progress_activity
            </span>
            <p className="mt-2 text-slate-300">Loading prescriptions...</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && prescriptions.length === 0 && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-12 text-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-slate-500">
              folder_open
            </span>
            <h2 className="text-2xl font-bold">No prescriptions found</h2>
            <p className="text-slate-400">
              Upload your first prescription to start verification.
            </p>
            <Link
              to="/ai-prescription"
              className="inline-flex rounded-xl bg-cyan-400 text-slate-900 px-5 py-2.5 font-bold"
            >
              Upload Prescription
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {prescriptions.map((prescription) => {
            const statusClass =
              STATUS_STYLES[prescription.status] || STATUS_STYLES.pending;
            const confidence = toPercent(prescription.aiConfidenceScore);

            return (
              <article
                key={prescription._id}
                className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 space-y-4"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
                    {prescription.images?.[0] ? (
                      <img
                        src={prescription.images[0]}
                        alt="Prescription"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined">
                          image_not_supported
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${statusClass}`}
                      >
                        {STATUS_LABELS[prescription.status] ||
                          STATUS_LABELS.pending}
                      </span>
                      <span className="text-xs text-slate-400">
                        Uploaded{" "}
                        {new Date(prescription.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 mb-1">
                        AI confidence
                      </p>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400"
                          style={{ width: `${confidence}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {confidence}%
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-200 mb-2">
                    Extracted medicines
                  </p>
                  <div className="space-y-1.5">
                    {(prescription.aiExtractedMedicines || [])
                      .slice(0, 5)
                      .map((medicine, index) => (
                        <div
                          key={`${medicine.name}-${index}`}
                          className="text-sm text-slate-300 flex justify-between gap-3"
                        >
                          <span>{medicine.name || "Unknown medicine"}</span>
                          <span className="text-slate-400">
                            {medicine.dosage ||
                              medicine.quantity ||
                              "As directed"}
                          </span>
                        </div>
                      ))}
                    {(!prescription.aiExtractedMedicines ||
                      prescription.aiExtractedMedicines.length === 0) && (
                      <p className="text-sm text-slate-500">
                        No medicines extracted
                      </p>
                    )}
                  </div>
                </div>

                {(prescription.status === "ai_rejected" ||
                  prescription.status === "rejected") && (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                    Rejection reason:{" "}
                    {prescription.aiRejectionReason ||
                      prescription.pharmacistNotes ||
                      "Not available"}
                  </div>
                )}

                {prescription.status === "approved" &&
                  prescription.pharmacistNotes && (
                    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                      Pharmacist note: {prescription.pharmacistNotes}
                    </div>
                  )}

                {prescription.expiryDate && (
                  <p className="text-xs text-slate-400">
                    Expiry:{" "}
                    {new Date(prescription.expiryDate).toLocaleDateString()}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrescriptionStatus;
