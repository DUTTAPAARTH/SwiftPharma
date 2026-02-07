import React from "react";

const DisclaimerModal = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      aria-label="Close disclaimer"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        className="bg-surface rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-semibold text-textPrimary">Disclaimer</h3>
        <p className="text-sm text-textSecondary">
          This information is for guidance only and does not replace
          professional medical advice. Please consult a doctor if you have
          concerns or symptoms persist.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 rounded-full bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default DisclaimerModal;
