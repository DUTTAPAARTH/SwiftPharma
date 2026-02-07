import React from "react";
import ChatBubble from "./ChatBubble";

const ChatMessages = ({ messages, user, bottomRef }) => {
  if (!messages.length) {
    return (
      <div className="text-center py-20 space-y-4 bg-bg">
        <div className="flex justify-center mb-6">
          <div
            className="w-32 h-32 rounded-full flex items-center justify-center text-7xl animate-float"
            style={{
              background: "linear-gradient(135deg, #2563EB 0%, #1e40af 100%)",
            }}
          >
            <span className="filter drop-shadow-lg">💊</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-textPrimary">
          👋 Hi {user?.name?.split(" ")[0] || "there"}!
        </h2>
        <p className="text-lg font-semibold text-primary">
          I'm your AI Pharmacist.
        </p>
        <p className="text-base text-textSecondary max-w-md mx-auto">
          Ask me how to take your medicines safely.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 min-h-[520px] bg-bg">
      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatMessages;
