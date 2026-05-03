import React from "react";
import ReactMarkdown from "react-markdown";

const ChatMessage = ({ role, content, createdAt }) => {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[90%] sm:max-w-[86%] rounded-2xl px-3 py-2 pb-6 text-sm leading-relaxed shadow-sm break-words ${
          isUser
            ? "bg-teal-600 text-white rounded-br-md"
            : "bg-white border border-slate-200 text-slate-700 rounded-bl-md"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 break-words">
            <ReactMarkdown>{content || ""}</ReactMarkdown>
          </div>
        )}

        <p className={`absolute right-3 bottom-2 text-[10px] ${isUser ? "text-teal-100" : "text-slate-400"}`}>
          {createdAt ? new Date(createdAt).toLocaleTimeString() : "now"}
        </p>
      </div>
    </div>
  );
};

export default ChatMessage;
