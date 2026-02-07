import React from "react";

const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="relative w-10 h-10 rounded-full bg-primarySoft overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-shimmer" />
      </div>

      <div className="space-y-2">
        <div className="w-40 h-3 rounded bg-primarySoft relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-shimmer" />
        </div>
        <div className="w-28 h-3 rounded bg-primarySoft relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full animate-shimmer" />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
