import React, { useState } from "react";

const statusColors = {
  approved: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  invalid: "bg-red-100 text-red-700",
};

const PrescriptionReviewCard = ({ data, onDecision }) => {
  const [note, setNote] = useState("");

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-border-subtle space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-darkGraphite">{data.userId}</p>
          <p className="text-sm text-darkGraphite/70">
            Doctor: {data.doctorName || "—"}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            statusColors[data.status] || "bg-border-subtle text-ink"
          }`}
        >
          {data.status}
        </span>
      </div>
      <div className="text-xs text-darkGraphite/80">
        <p>Valid until {new Date(data.expiryDate).toLocaleDateString()}</p>
        <p className="truncate">OCR: {data.ocrText || "No text"}</p>
      </div>
      <div className="flex gap-2 text-sm">
        {data.images?.[0] && (
          <a
            href={data.images[0]}
            target="_blank"
            rel="noreferrer"
            className="text-orangeCTA font-semibold"
          >
            View Image
          </a>
        )}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-lg border border-border-subtle px-3 py-2 text-sm"
        placeholder="Admin notes / override reason"
      />
      <div className="mt-3 flex gap-2">
        <button
          className="bg-green-600 text-white px-3 py-2 rounded"
          onClick={() => onDecision?.(data._id, "approved", note)}
        >
          Approve
        </button>
        <button
          className="bg-red-500 text-white px-3 py-2 rounded"
          onClick={() => onDecision?.(data._id, "rejected", note)}
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default PrescriptionReviewCard;
