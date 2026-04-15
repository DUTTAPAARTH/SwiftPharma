import React from "react";

const HealthCompanionFAB = ({ isOpen, unreadMentions, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed z-[2190] right-4 bottom-4 md:right-6 md:bottom-6 inline-flex items-center justify-center p-3 text-[var(--color-brand,#13b6ec)] hover:scale-[1.02] transition-transform"
      style={{
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      aria-label={isOpen ? "Close health companion" : "Open health companion"}
    >
      <span className="material-symbols-outlined text-[34px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.25)]">
        health_and_safety
      </span>
      {unreadMentions > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1 rounded-full bg-[var(--color-danger,#ef4444)] text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
          {unreadMentions > 9 ? "9+" : unreadMentions}
        </span>
      ) : null}
    </button>
  );
};

export default HealthCompanionFAB;
