import React from "react";
import { motion } from "framer-motion";

const MedicineCard = ({ card, confidenceIcon }) => {
  return (
    <motion.div
      className="mt-4 rounded-2xl bg-white border border-border shadow-soft p-4 text-xs text-secondary-text"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: 0.1 }}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="font-semibold text-primary-text">
          💊 {card.medicine_name}
        </p>
        <span className="text-xs font-semibold">{confidenceIcon}</span>
      </div>
      <div className="mt-3 space-y-2">
        <p>
          <span className="font-semibold text-primary-text">🕒 Timing:</span>{" "}
          <span className="font-semibold">{card.timing}</span>
        </p>
        <p>
          <span className="font-semibold text-primary-text">🍽️ Food:</span>{" "}
          <span className="font-semibold">{card.food_rule}</span>
        </p>
        <p>
          <span className="font-semibold text-primary-text">⏱ Duration:</span>{" "}
          {card.duration}
        </p>
        <p>
          <span className="font-semibold text-primary-text">👶 Age:</span>{" "}
          {card.age_suitability}
        </p>
        <p className="rounded-xl bg-yellow-50 border border-yellow-200 px-3 py-2 text-yellow-800">
          ⚠️ Warning: {card.key_warning}
        </p>
      </div>
    </motion.div>
  );
};

export default MedicineCard;
