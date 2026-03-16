import React, { useCallback, useEffect, useRef, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import apiClient from "../../services/apiClient";

// ─── Utilities ────────────────────────────────────────────────────────────────

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const showToast = (message, type = "success") => {
  const existing = document.getElementById("rx-admin-toast");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.id = "rx-admin-toast";
  t.textContent = message;
  Object.assign(t.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "9999",
    padding: "12px 18px",
    borderRadius: "12px",
    background: type === "success" ? "#061a10" : "#1a0606",
    color: type === "success" ? "#6ee7b7" : "#fca5a5",
    border: `1px solid ${type === "success" ? "#059669" : "#dc2626"}`,
    boxShadow: "0 12px 30px rgba(0,0,0,0.55)",
    fontWeight: "700",
    fontSize: "13px",
    maxWidth: "340px",
  });
  document.body.appendChild(t);
  setTimeout(() => t?.remove(), 3200);
};

// ─── Constants ────────────────────────────────────────────────────────────────

const REJECTION_REASONS = [
  "Image too blurry",
  "Missing doctor registration number",
  "Prescription older than 6 months",
  "Incomplete prescription",
  "Suspected fake prescription",
  "Digital screenshot not accepted",
];

const STATUS_META = {
  pending: {
    label: "Pending",
    cls: "bg-slate-500/15 text-slate-200 border-slate-400/30",
  },
  awaiting_pharmacist: {
    label: "Awaiting Review",
    cls: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  },
  approved: {
    label: "Approved",
    cls: "bg-green-500/15 text-green-300 border-green-400/30",
  },
  rejected: {
    label: "Rejected",
    cls: "bg-red-500/15 text-red-300 border-red-400/30",
  },
  ai_rejected: {
    label: "AI Rejected",
    cls: "bg-red-900/20 text-red-400 border-red-700/30",
  },
  ai_reviewing: {
    label: "AI Reviewing",
    cls: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  },
  expired: {
    label: "Expired",
    cls: "bg-slate-700/20 text-slate-400 border-slate-600/30",
  },
};

const StatusBadge = ({ status, pulse }) => {
  const meta = STATUS_META[status] || {
    label: status,
    cls: "bg-slate-500/15 text-slate-200 border-slate-400/30",
  };
  const pulseCls =
    pulse || status === "awaiting_pharmacist" ? " animate-pulse" : "";
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold px-2 py-1 rounded-full border${pulseCls} ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
};

// ─── ConfidenceBar ────────────────────────────────────────────────────────────

const ConfidenceBar = ({ score }) => {
  const s = Number(score ?? 0);
  const color =
    s >= 80 ? "bg-green-500" : s >= 50 ? "bg-amber-500" : "bg-red-500";
  const txtColor =
    s >= 80 ? "text-green-300" : s >= 50 ? "text-amber-300" : "text-red-300";
  return (
    <div>
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
          AI Confidence
        </span>
        <span className={`text-3xl font-black leading-none ${txtColor}`}>
          {s}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-[#1a2540] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${s}%` }}
        />
      </div>
    </div>
  );
};

// ─── ImageLightbox ────────────────────────────────────────────────────────────

const ImageLightbox = ({
  images,
  initialIndex = 0,
  patientName,
  createdAt,
  onClose,
}) => {
  const [idx, setIdx] = useState(initialIndex);
  const total = images.length;

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/92 flex flex-col items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Header bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-white font-bold">{patientName || "Patient"}</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Uploaded {timeAgo(createdAt)}
          </p>
        </div>
        {total > 1 && (
          <p className="text-slate-300 text-sm font-semibold">
            {idx + 1} / {total}
          </p>
        )}
        <button
          onClick={onClose}
          className="size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          aria-label="Close"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Image */}
      <div
        className="flex items-center justify-center px-20"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[idx]}
          alt="Prescription"
          className="max-h-[80vh] max-w-[85vw] object-contain rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.8)]"
        />
      </div>

      {/* Prev / Next */}
      {total > 1 && (
        <>
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              className="size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-25 transition"
              aria-label="Previous image"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          </div>
          <div
            className="absolute right-4 top-1/2 -translate-y-1/2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              disabled={idx === total - 1}
              onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              className="size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-25 transition"
              aria-label="Next image"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── ApprovalModal ────────────────────────────────────────────────────────────

const ApprovalModal = ({ rx, onConfirm, onCancel }) => {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#1a2540] bg-[#0d1424] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.65)]">
        <div className="flex items-center gap-3 mb-1">
          <div className="size-10 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">
              check_circle
            </span>
          </div>
          <h2 className="text-xl font-black text-white">
            Approve Prescription
          </h2>
        </div>
        <p className="text-slate-400 text-sm mb-4 ml-[52px]">
          Patient:{" "}
          <span className="text-white font-semibold">{rx.user?.name}</span>
        </p>

        {rx.imageUrl && (
          <div
            className="mb-4 rounded-xl overflow-hidden border border-[#1a2540] bg-black flex items-center justify-center"
            style={{ maxHeight: 200 }}
          >
            <img
              src={rx.imageUrl}
              alt="Prescription"
              className="max-h-[200px] w-auto object-contain"
            />
          </div>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add pharmacist notes (optional)..."
          rows={3}
          className="w-full rounded-xl border border-[#1a2540] bg-[#0a0f1e] px-4 py-3 text-slate-100 text-sm placeholder:text-slate-500 outline-none focus:border-green-500/40 resize-none"
        />

        <div className="flex gap-3 mt-5">
          <button
            onClick={() => onConfirm(notes)}
            className="flex-1 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black py-3 transition"
          >
            Confirm Approval
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[#1a2540] bg-[#0a0f1e] text-slate-300 font-semibold py-3 hover:bg-[#121d35] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── RejectionModal ───────────────────────────────────────────────────────────

const RejectionModal = ({ rx, onConfirm, onCancel }) => {
  const [reason, setReason] = useState("");
  const canSubmit = reason.trim().length > 0;

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-[#0d1424] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.65)]">
        <div className="flex items-center gap-3 mb-1">
          <div className="size-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">
              cancel
            </span>
          </div>
          <h2 className="text-xl font-black text-white">Reject Prescription</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4 ml-[52px]">
          Patient:{" "}
          <span className="text-white font-semibold">{rx.user?.name}</span>
        </p>

        {rx.imageUrl && (
          <div
            className="mb-4 rounded-xl overflow-hidden border border-[#1a2540] bg-black flex items-center justify-center"
            style={{ maxHeight: 160 }}
          >
            <img
              src={rx.imageUrl}
              alt="Prescription"
              className="max-h-[160px] w-auto object-contain"
            />
          </div>
        )}

        <label className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2 block">
          This reason will be shown to the patient
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection (required)..."
          rows={3}
          className="w-full rounded-xl border border-red-500/30 bg-[#0a0f1e] px-4 py-3 text-slate-100 text-sm placeholder:text-slate-500 outline-none focus:border-red-500/50 resize-none"
        />

        <div className="flex flex-wrap gap-2 mt-3">
          {REJECTION_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className="rounded-full border border-[#1a2540] bg-[#0a0f1e] px-3 py-1 text-[11px] text-slate-400 hover:border-red-500/40 hover:text-red-300 transition"
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={() => onConfirm(reason)}
            disabled={!canSubmit}
            className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black py-3 transition disabled:opacity-35 disabled:cursor-not-allowed"
          >
            Confirm Rejection
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[#1a2540] bg-[#0a0f1e] text-slate-300 font-semibold py-3 hover:bg-[#121d35] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5 animate-pulse">
    <div className="flex gap-5">
      <div className="w-[40%] h-52 rounded-xl bg-[#1a2540]" />
      <div className="flex-1 space-y-3">
        <div className="h-3 bg-[#1a2540] rounded w-1/2" />
        <div className="h-3 bg-[#1a2540] rounded w-3/4" />
        <div className="h-10 bg-[#1a2540] rounded w-1/3 mt-5" />
        <div className="h-2 bg-[#1a2540] rounded w-full" />
        <div className="flex gap-2 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 w-24 bg-[#1a2540] rounded-full" />
          ))}
        </div>
      </div>
      <div className="w-[25%] min-w-[120px] space-y-3">
        <div className="h-12 bg-[#1a2540] rounded-xl" />
        <div className="h-12 bg-[#1a2540] rounded-xl" />
      </div>
    </div>
  </div>
);

// ─── PrescriptionCard ─────────────────────────────────────────────────────────

const PrescriptionCard = ({ rx, flash, onApprove, onReject }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const images = rx.images?.length
    ? rx.images
    : rx.imageUrl
      ? [rx.imageUrl]
      : [];

  const flashCls =
    flash === "approve"
      ? "ring-2 ring-green-500/60 bg-green-500/5 scale-[0.99]"
      : flash === "reject"
        ? "ring-2 ring-red-500/60 bg-red-500/5 scale-[0.99]"
        : "";

  return (
    <>
      <div
        className={`rounded-2xl border border-[#1a2540] bg-[#0d1424] p-5 transition-all duration-300 ${flashCls}`}
      >
        <div className="flex gap-5 flex-wrap xl:flex-nowrap">
          {/* LEFT — image + meta */}
          <div className="w-full xl:w-[38%] min-w-[180px] flex-shrink-0">
            <div
              className="rounded-xl overflow-hidden border border-[#1a2540] bg-[#080d1a] cursor-pointer group relative"
              style={{ height: 210 }}
              onClick={() => images.length > 0 && setLightboxOpen(true)}
              role="button"
              aria-label="View full prescription image"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" && images.length > 0 && setLightboxOpen(true)
              }
            >
              {images.length > 0 ? (
                <>
                  <img
                    src={images[0]}
                    alt="Prescription thumbnail"
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/50">
                    <span className="material-symbols-outlined text-white text-[40px]">
                      zoom_in
                    </span>
                  </div>
                  {images.length > 1 && (
                    <div className="absolute bottom-2 right-2 rounded-full bg-black/70 text-white text-[10px] px-2 py-0.5 font-bold">
                      +{images.length - 1} more
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-slate-600 text-[48px]">
                    image_not_supported
                  </span>
                  <p className="text-xs text-slate-500">No image</p>
                </div>
              )}
            </div>

            <div className="mt-3 space-y-1">
              <p className="text-[11px] text-slate-400">
                Uploaded:{" "}
                <span className="text-slate-200 font-semibold">
                  {timeAgo(rx.createdAt)}
                </span>
              </p>
              <p className="text-[11px] text-slate-400">
                Patient:{" "}
                <span className="text-white font-bold">
                  {rx.user?.name || "Unknown"}
                </span>
              </p>
              {rx.user?.email && (
                <p className="text-[11px] text-slate-500 truncate">
                  {rx.user.email}
                </p>
              )}
              {rx.doctorName && (
                <p className="text-[11px] text-slate-400">
                  Doctor:{" "}
                  <span className="text-slate-200">{rx.doctorName}</span>
                </p>
              )}
              <div className="pt-1">
                <StatusBadge status={rx.status} />
              </div>
            </div>
          </div>

          {/* MIDDLE — AI analysis */}
          <div className="flex-1 min-w-0">
            <ConfidenceBar score={rx.aiConfidenceScore} />

            {rx.aiExtractedMedicines?.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
                  Extracted Medicines ({rx.aiExtractedMedicines.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rx.aiExtractedMedicines.map((med, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 text-[11px] px-2.5 py-1 font-medium"
                    >
                      {med.name}
                      {med.dosage ? ` ${med.dosage}` : ""}
                      {med.quantity ? ` ×${med.quantity}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {rx.aiFlags?.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-widest text-amber-400/80 font-semibold mb-2">
                  AI Flags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {rx.aiFlags.map((flag, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-amber-500/35 bg-amber-500/10 text-amber-300 text-[10px] px-2.5 py-0.5 font-semibold"
                    >
                      ⚠ {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {rx.aiRejectionReason && (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-[10px] uppercase tracking-widest text-red-400 font-semibold mb-1">
                  AI Rejection Reason
                </p>
                <p className="text-xs text-red-300">{rx.aiRejectionReason}</p>
              </div>
            )}
          </div>

          {/* RIGHT — actions */}
          <div className="w-full xl:w-[22%] min-w-[140px] flex flex-col gap-3 flex-shrink-0">
            <button
              onClick={() => onApprove(rx)}
              className="w-full rounded-xl bg-green-600/20 hover:bg-green-600/35 border border-green-500/40 text-green-300 font-bold py-3 text-sm transition flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                check_circle
              </span>
              Approve
            </button>
            <button
              onClick={() => onReject(rx)}
              className="w-full rounded-xl bg-red-600/20 hover:bg-red-600/35 border border-red-500/40 text-red-300 font-bold py-3 text-sm transition flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                cancel
              </span>
              Reject
            </button>
            {images.length > 0 && (
              <button
                onClick={() => setLightboxOpen(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline text-center py-1 transition"
              >
                View Full Image
              </button>
            )}
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={images}
          initialIndex={0}
          patientName={rx.user?.name}
          createdAt={rx.createdAt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
};

// ─── AllPrescriptionsTable ────────────────────────────────────────────────────

const AllPrescriptionsTable = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await apiClient.get(`/admin/prescriptions/all?${params}`);
      setList(res.data?.prescriptions || []);
      setTotalPages(res.data?.pages || 1);
      setTotal(res.data?.total || 0);
    } catch {
      setError(
        "Failed to load prescriptions. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-[#1a2540] bg-[#0a0f1e] text-slate-200 text-sm px-3 py-2.5 outline-none"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        <div className="flex gap-2 flex-1 max-w-sm">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by patient name or email..."
            className="flex-1 rounded-xl border border-[#1a2540] bg-[#0a0f1e] text-slate-200 text-sm px-3 py-2.5 outline-none placeholder:text-slate-500 focus:border-cyan-500/40"
          />
          <button
            onClick={handleSearch}
            className="rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 px-4 py-2 text-sm font-semibold hover:bg-cyan-500/25 transition"
          >
            Search
          </button>
        </div>

        <span className="text-xs text-slate-500 ml-auto">{total} records</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex items-center justify-between">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={load}
            className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-xs px-3 py-1.5 font-semibold hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#1a2540]">
              {[
                "Patient",
                "Upload Date",
                "Status",
                "AI Score",
                "Reviewed By",
                "Image",
              ].map((h) => (
                <th
                  key={h}
                  className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold px-4 py-3 text-left whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-[#1a2540] animate-pulse">
                  {[...Array(6)].map((__, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-3.5 bg-[#1a2540] rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="text-slate-400 text-sm">
                    No prescriptions found
                  </p>
                </td>
              </tr>
            ) : (
              list.map((rx) => {
                const score = Number(rx.aiConfidenceScore ?? -1);
                const scoreColor =
                  score < 0
                    ? "text-slate-500"
                    : score >= 80
                      ? "text-green-300"
                      : score >= 50
                        ? "text-amber-300"
                        : "text-red-300";
                return (
                  <tr
                    key={rx._id}
                    className="border-b border-[#1a2540] hover:bg-[#0a0f1e] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">
                        {rx.user?.name || "—"}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {rx.user?.email || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">
                      {timeAgo(rx.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rx.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${scoreColor}`}>
                        {score >= 0 ? `${score}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {rx.reviewedBy?.name || (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {rx.imageUrl ? (
                        <a
                          href={rx.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 text-xs hover:underline hover:text-cyan-300"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-xl border border-[#1a2540] bg-[#0d1424] text-slate-300 text-sm px-4 py-2 hover:bg-[#121d35] disabled:opacity-35 transition"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-400">
            Page <span className="text-white font-semibold">{page}</span> of{" "}
            {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-xl border border-[#1a2540] bg-[#0d1424] text-slate-300 text-sm px-4 py-2 hover:bg-[#121d35] disabled:opacity-35 transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

// ─── AdminPrescriptions (main) ────────────────────────────────────────────────

const AdminPrescriptions = () => {
  const [tab, setTab] = useState("pending");
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [flashMap, setFlashMap] = useState({});
  const [pendingActionMap, setPendingActionMap] = useState({});
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const autoRefreshRef = useRef(null);
  const pendingActionRef = useRef({});

  const updatePendingActions = useCallback((updater) => {
    setPendingActionMap((prev) => {
      const next = updater(prev);
      pendingActionRef.current = next;
      return next;
    });
  }, []);

  const loadQueue = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await apiClient.get(
        "/admin/prescriptions/queue?page=1&limit=100",
      );
      const prescriptions = res.data?.prescriptions || [];
      setQueue(
        prescriptions.filter((item) => !pendingActionRef.current[item._id]),
      );
    } catch {
      if (!isRefresh)
        setError("Failed to load prescription queue. Check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    autoRefreshRef.current = setInterval(() => loadQueue(true), 60_000);
    return () => clearInterval(autoRefreshRef.current);
  }, [loadQueue]);

  // Approval — optimistic: remove immediately, rollback on error
  const handleApprove = (notes) => {
    const rx = approveModal;
    if (!rx) return;
    setApproveModal(null);

    // Optimistic remove
    updatePendingActions((prev) => ({ ...prev, [rx._id]: "approve" }));
    setQueue((prev) => prev.filter((item) => item._id !== rx._id));
    setFlashMap((m) => ({ ...m, [rx._id]: "approve" }));

    apiClient
      .post(`/admin/prescriptions/${rx._id}/approve`, { notes })
      .then(async () => {
        showToast("Prescription approved successfully");
        await loadQueue(true);
      })
      .catch(() => {
        // Rollback
        updatePendingActions((prev) => {
          const next = { ...prev };
          delete next[rx._id];
          return next;
        });
        setQueue((prev) =>
          [...prev, rx].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
          ),
        );
        showToast("Failed to approve prescription. Please try again.", "error");
      })
      .finally(() => {
        updatePendingActions((prev) => {
          const next = { ...prev };
          delete next[rx._id];
          return next;
        });
        setTimeout(
          () =>
            setFlashMap((m) => {
              const n = { ...m };
              delete n[rx._id];
              return n;
            }),
          800,
        );
      });
  };

  // Rejection — flash red for 400ms, then remove
  const handleReject = (reason) => {
    const rx = rejectModal;
    if (!rx) return;
    setRejectModal(null);

    updatePendingActions((prev) => ({ ...prev, [rx._id]: "reject" }));
    setFlashMap((m) => ({ ...m, [rx._id]: "reject" }));

    setTimeout(() => {
      setQueue((prev) => prev.filter((item) => item._id !== rx._id));
      setFlashMap((m) => {
        const n = { ...m };
        delete n[rx._id];
        return n;
      });

      apiClient
        .post(`/admin/prescriptions/${rx._id}/reject`, { reason })
        .then(async () => {
          showToast("Prescription rejected");
          await loadQueue(true);
        })
        .catch(() => {
          updatePendingActions((prev) => {
            const next = { ...prev };
            delete next[rx._id];
            return next;
          });
          setQueue((prev) =>
            [...prev, rx].sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
            ),
          );
          showToast(
            "Failed to reject prescription. Please try again.",
            "error",
          );
        })
        .finally(() => {
          updatePendingActions((prev) => {
            const next = { ...prev };
            delete next[rx._id];
            return next;
          });
        });
    }, 400);
  };

  const pendingCount = queue.length;

  return (
    <AdminLayout title="Prescription Review">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-white">Prescription Queue</h1>
          {!loading &&
            (pendingCount > 0 ? (
              <span className="rounded-full border border-amber-500/45 bg-amber-500/15 text-amber-300 text-xs font-bold px-3 py-1 animate-pulse">
                {pendingCount} awaiting review
              </span>
            ) : (
              <span className="rounded-full border border-green-500/35 bg-green-500/10 text-green-300 text-xs font-bold px-3 py-1">
                All clear
              </span>
            ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex rounded-xl border border-[#1a2540] bg-[#0a0f1e] p-1 gap-1">
            {[
              { key: "pending", label: "Pending Review" },
              { key: "all", label: "All Prescriptions" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                  tab === key
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
                {key === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500 text-[#0a0f1e] text-[9px] font-black px-1.5 py-0.5">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => loadQueue(true)}
            disabled={refreshing}
            title="Refresh queue"
            className="size-10 rounded-xl border border-[#1a2540] bg-[#0d1424] text-slate-300 hover:text-cyan-300 flex items-center justify-center transition"
          >
            <span
              className={`material-symbols-outlined text-[20px] ${refreshing ? "animate-spin" : ""}`}
            >
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Tab content */}
      {tab === "pending" ? (
        <div className="space-y-4">
          {/* Error banner */}
          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 flex items-center justify-between gap-4">
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={() => loadQueue()}
                className="flex-shrink-0 rounded-xl border border-red-500/35 bg-red-500/10 text-red-300 text-xs px-3 py-2 font-semibold hover:bg-red-500/20 transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
          ) : queue.length === 0 ? (
            /* Empty state */
            <div className="rounded-2xl border border-[#1a2540] bg-[#0d1424] p-16 text-center">
              <div className="mx-auto mb-5 size-24 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[48px]">
                  check_circle
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">
                No prescriptions awaiting review
              </h3>
              <p className="text-slate-400 text-sm mt-2">
                All prescriptions have been processed
              </p>
            </div>
          ) : (
            /* Queue cards */
            queue.map((rx) => (
              <PrescriptionCard
                key={rx._id}
                rx={rx}
                flash={flashMap[rx._id]}
                onApprove={(rx) => setApproveModal(rx)}
                onReject={(rx) => setRejectModal(rx)}
              />
            ))
          )}
        </div>
      ) : (
        <AllPrescriptionsTable />
      )}

      {/* Modals */}
      {approveModal && (
        <ApprovalModal
          rx={approveModal}
          onConfirm={handleApprove}
          onCancel={() => setApproveModal(null)}
        />
      )}
      {rejectModal && (
        <RejectionModal
          rx={rejectModal}
          onConfirm={handleReject}
          onCancel={() => setRejectModal(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminPrescriptions;
