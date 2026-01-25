import React from "react";

const SupportChatWidget = () => (
  <div className="fixed bottom-4 right-4 bg-darkGraphite text-brown p-4 rounded-lg shadow-lg w-64">
    <p className="font-semibold">Support Chat</p>
    <p className="text-sm text-brown/80">We usually reply in minutes.</p>
    <button className="mt-3 w-full bg-orangeCTA text-brown py-2 rounded">
      Start Chat
    </button>
  </div>
);

export default SupportChatWidget;
