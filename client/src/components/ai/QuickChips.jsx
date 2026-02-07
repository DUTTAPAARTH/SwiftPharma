import React from "react";

const chips = [
  "💊 Ask about a medicine",
  "⏰ Missed a dose",
  "⚠️ Side effects",
  "👨‍⚕️ Talk to pharmacist",
];

const QuickChips = ({ onSelect }) => {
  return (
    <div className="flex flex-wrap gap-3 mt-6">
      <button
        type="button"
        onClick={() => onSelect("💊 Ask about a medicine")}
        className="bg-primary text-white px-4 py-2 rounded-lg text-sm shadow-sm hover:opacity-90 transition-opacity"
      >
        💊 Ask about a medicine
      </button>

      <button
        type="button"
        onClick={() => onSelect("⏰ Missed a dose")}
        className="bg-surface border border-border px-4 py-2 rounded-lg text-sm text-textPrimary hover:bg-slate-50 transition-colors"
      >
        ⏰ Missed dose
      </button>

      <button
        type="button"
        onClick={() => onSelect("⚠️ Side effects")}
        className="bg-surface border border-border px-4 py-2 rounded-lg text-sm text-textPrimary hover:bg-slate-50 transition-colors"
      >
        ⚠️ Side effects
      </button>

      <button
        type="button"
        onClick={() => onSelect("👨‍⚕️ Talk to pharmacist")}
        className="text-primary text-sm underline hover:no-underline transition-all"
      >
        👨‍⚕️ Talk to pharmacist
      </button>
    </div>
  );
};

export default QuickChips;
