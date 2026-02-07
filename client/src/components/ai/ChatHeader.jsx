import React from "react";

const ChatHeader = ({ onInfo }) => {
  return (
    <div className="bg-primary px-6 py-4 text-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 text-xl">
            💊
          </div>
          <div>
            <h1 className="font-semibold text-lg">AI Pharmacist</h1>
            <p className="text-xs text-white/80">24×7 Medicine Help</p>
          </div>
        </div>
        <span className="flex items-center gap-2 text-xs bg-white/20 px-3 py-1 rounded-full">
          <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
          Online
        </span>
      </div>
    </div>
  );
};

export default ChatHeader;
