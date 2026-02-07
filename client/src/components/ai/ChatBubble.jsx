import React from "react";
import { motion } from "framer-motion";

const ChatBubble = ({ message }) => {
  const isUser = message.role === "user";

  // AI Message Bubble with Avatar
  if (!isUser) {
    return (
      <motion.div
        className="flex items-start gap-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Avatar */}
        <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primarySoft text-primary text-sm flex-shrink-0">
          💊
        </div>

        {/* Bubble */}
        <div className="bg-surface border border-border rounded-2xl px-4 py-3 max-w-[70%] shadow-sm">
          <p className="text-[15px] text-textPrimary leading-relaxed whitespace-pre-line">
            {message.text}
          </p>

          {/* Emergency Alert */}
          {message.emergency && (
            <div className="mt-3 border border-danger bg-surface text-danger rounded-xl px-3 py-2 text-xs">
              ❗ Emergency Alert: Seek immediate medical care
            </div>
          )}

          {/* Disclaimer */}
          {message.confidenceLevel && message.confidenceLevel !== "high" && (
            <p className="mt-2 text-xs text-textSecondary opacity-70">
              ℹ️ General guidance. Please consult a healthcare professional.
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  // User Message Bubble
  return (
    <motion.div
      className="flex justify-end"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-primary text-white rounded-2xl px-4 py-3 max-w-[70%] shadow-sm">
        <p className="text-[15px] font-medium whitespace-pre-line">
          {message.text}
        </p>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
