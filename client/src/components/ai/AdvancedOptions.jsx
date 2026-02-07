import React from "react";
import { motion } from "framer-motion";

const AdvancedOptions = ({ state, dispatch }) => {
  return (
    <div className="bg-white border-t border-border px-6 py-5">
      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: "SET",
              field: "showAdvanced",
              value: !state.showAdvanced,
            })
          }
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <span
            className={`transform transition-transform ${state.showAdvanced ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          ⚙️ Add optional details (improves accuracy)
        </button>

        {state.showAdvanced && (
          <motion.div
            className="grid md:grid-cols-3 gap-4 mt-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div>
              <label className="text-xs font-semibold text-textPrimary block mb-2">
                Medicine name
              </label>
              <input
                type="text"
                value={state.medicineName}
                onChange={(e) =>
                  dispatch({
                    type: "SET",
                    field: "medicineName",
                    value: e.target.value,
                  })
                }
                placeholder="e.g., Paracetamol 500"
                className="w-full rounded-xl border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-textPrimary placeholder:text-textSecondary"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-textPrimary block mb-2">
                Ongoing medicines
              </label>
              <input
                type="text"
                value={state.otherMedicines}
                onChange={(e) =>
                  dispatch({
                    type: "SET",
                    field: "otherMedicines",
                    value: e.target.value,
                  })
                }
                placeholder="Comma-separated"
                className="w-full rounded-xl border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-textPrimary placeholder:text-textSecondary"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-semibold text-textPrimary block mb-2">
                  Age
                </label>
                <select
                  value={state.ageGroup}
                  onChange={(e) =>
                    dispatch({
                      type: "SET",
                      field: "ageGroup",
                      value: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-textPrimary"
                >
                  <option value="child">Child</option>
                  <option value="adult">Adult</option>
                  <option value="elderly">Elderly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-textPrimary block mb-2">
                  Time
                </label>
                <select
                  value={state.timeOfDay}
                  onChange={(e) =>
                    dispatch({
                      type: "SET",
                      field: "timeOfDay",
                      value: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-textPrimary"
                >
                  <option value="">Any</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-textPrimary block mb-2">
                  Language
                </label>
                <select
                  value={state.language}
                  onChange={(e) =>
                    dispatch({
                      type: "SET",
                      field: "language",
                      value: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-textPrimary"
                >
                  <option value="">Auto</option>
                  <option value="English">English</option>
                  <option value="Hinglish">Hinglish</option>
                  <option value="Simple English">Simple</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdvancedOptions;
