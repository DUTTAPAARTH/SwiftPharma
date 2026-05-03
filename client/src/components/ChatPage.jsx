import React from "react";
import Navbar from "./layout/Navbar";

const ChatPage = () => {
  return (
    <>
      <Navbar />
      <main className="bg-[radial-gradient(circle_at_top_left,rgba(19,182,236,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_24%),linear-gradient(180deg,#081123_0%,#0d182e_100%)] pt-24 pb-4">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.2em] font-black text-cyan-300">
            Health Companion
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-black text-white">
            Personal Health AI Companion
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Use this full-page workspace for longer sessions. The floating companion remains available throughout the app.
          </p>
        </div>
      </main>
    </>
  );
};

export default ChatPage;
