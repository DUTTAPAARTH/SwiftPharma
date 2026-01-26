import React from "react";

const SubstituteModal = ({
  baseProduct,
  options = [],
  loading = false,
  onClose,
  onAddToCart,
  onReplaceInCart,
}) => {
  if (!baseProduct) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-border overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <p className="text-xs text-secondary-text uppercase tracking-wide">
              Substitute options
            </p>
            <h3 className="text-2xl font-nexus-bold text-primary-text">
              {baseProduct.name}
            </h3>
            <p className="text-sm text-secondary-text">
              Composition: {baseProduct.composition || "See details"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-border text-secondary-text hover:text-primary-text hover:border-primary-text transition"
            aria-label="Close substitutes"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center text-secondary-text py-6">
              Loading substitutes...
            </div>
          ) : options.length === 0 ? (
            <div className="text-center text-secondary-text py-6">
              No substitutes found with the same salt and dosage.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {options.map((option) => {
                const cheaper =
                  Number(option.price) < Number(baseProduct.price || Infinity);
                return (
                  <div
                    key={option._id || option.id}
                    className="rounded-2xl border border-border bg-white shadow-soft p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-secondary-text uppercase tracking-wide">
                          {option.manufacturer || "Trusted manufacturer"}
                        </p>
                        <h4 className="text-lg font-nexus-bold text-primary-text leading-snug">
                          {option.name}
                        </h4>
                        <p className="text-sm text-secondary-text">
                          {option.composition || baseProduct.composition}
                        </p>
                        {option.strength ? (
                          <p className="text-xs text-secondary-text">
                            Strength: {option.strength}
                          </p>
                        ) : null}
                      </div>
                      {cheaper ? (
                        <span className="px-2 py-1 rounded-full bg-[#ecfdf3] text-[#15803d] text-[11px] font-semibold border border-[#bbf7d0]">
                          Lower price
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xl font-nexus-bold text-primary-text">
                        ₹{Number(option.price || 0).toFixed(2)}
                        {option.mrp && option.mrp > option.price ? (
                          <span className="text-xs text-secondary-text line-through ml-2">
                            ₹{Number(option.mrp).toFixed(2)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-2 rounded-full border border-border text-sm font-semibold hover:-translate-y-0.5 hover:shadow-card transition"
                          onClick={() => onReplaceInCart?.(option)}
                        >
                          Replace
                        </button>
                        <button
                          className="px-3 py-2 rounded-full bg-brand-coral text-white text-sm font-semibold shadow-soft hover:shadow-card transition"
                          onClick={() => onAddToCart?.(option)}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubstituteModal;
