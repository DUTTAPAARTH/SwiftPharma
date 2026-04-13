import { useContext, useEffect, useReducer, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import { AuthContext } from "../context/AuthContext";
import {
  askMedicineAssistant,
  clearChatHistory,
  getChatHistory,
} from "../services/assistantService";

const DISCLAIMER =
  "For informational purposes only. Always consult a licensed pharmacist.";

const SUGGESTED_QUESTIONS = [
  "What are the side effects of Paracetamol 500mg?",
  "Can I take Ibuprofen and Aspirin together?",
  "Is Azithromycin safe during pregnancy?",
  "What is the correct dose of Metformin for adults?",
  "I missed my blood pressure medicine, what do I do?",
];

const QUICK_CHIPS = [
  {
    label: "Missed Dose",
    question: "I missed my dose today. What should I do?",
  },
  {
    label: "Side Effects",
    question: "What are common side effects I should watch for?",
  },
  {
    label: "Drug Interactions",
    question: "Which medicines should not be taken together?",
  },
  {
    label: "Safe in Pregnancy",
    question: "Which medicines are safe to take during pregnancy?",
  },
];

const initialState = {
  question: "",
  medicineName: "",
  otherMedicines: "",
  ageGroup: "adult",
  timeOfDay: "",
  language: "",
  messages: [],
  loading: false,
  error: "",
  showDisclaimer: false,
  showAdvanced: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET":
      return { ...state, [action.field]: action.value };
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_MESSAGES":
      return { ...state, messages: action.payload };
    case "LOADING":
      return { ...state, loading: action.value };
    case "ERROR":
      return { ...state, error: action.value };
    default:
      return state;
  }
}

/* ─── Bot message ──────────────────────────────────────────────────────── */
const BotMessage = ({ msg, onFollowUpClick, showFollowUps }) => (
  <div className="flex gap-3 items-start">
    <div
      className="size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
      style={{
        background: msg.emergency
          ? "linear-gradient(135deg,#ef4444 0%,#f97316 100%)"
          : "linear-gradient(135deg,#00bcd4 0%,#0097a7 100%)",
        boxShadow: msg.emergency
          ? "0 0 12px rgba(239,68,68,0.35)"
          : "0 0 12px rgba(0,188,212,0.35)",
      }}
    >
      <span
        className="material-symbols-outlined text-white font-black"
        style={{ fontSize: "16px" }}
      >
        {msg.emergency ? "warning" : "medical_services"}
      </span>
    </div>
    <div className="max-w-[78%] space-y-2">
      <div
        className="px-5 py-4 text-sm leading-relaxed"
        style={{
          background: msg.emergency ? "#291515" : "#13192a",
          border: msg.emergency
            ? "1px solid rgba(239,68,68,0.6)"
            : "1px solid #1e2d42",
          borderRadius: "4px 18px 18px 18px",
          color: msg.emergency ? "#fecaca" : "#cbd5e1",
        }}
      >
        {msg.emergency && (
          <div className="flex items-center gap-2 mb-3 text-red-300 font-black text-xs uppercase tracking-widest">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "14px" }}
            >
              warning
            </span>
            Emergency Guidance
          </div>
        )}
        {msg.text.split("\n").map((line, i) =>
          line.trim() === "" ? (
            <div key={i} className="h-2" />
          ) : (
            <p key={i} className="mb-1 last:mb-0">
              {line}
            </p>
          ),
        )}
        {msg.emergency && (
          <div
            className="mt-4 rounded-xl p-3"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
            }}
          >
            <p className="text-xs font-black text-red-300 uppercase tracking-widest mb-1">
              Helplines
            </p>
            <p className="text-sm font-bold text-red-200">
              NIMHANS: 080-46110007
            </p>
            <p className="text-sm font-bold text-red-200">iCall: 9152987821</p>
          </div>
        )}
      </div>

      {!!msg.sources?.length && (
        <div className="flex items-center flex-wrap gap-2 pl-1">
          <span
            className="text-[10px] font-semibold"
            style={{ color: "#64748b" }}
          >
            Sources:
          </span>
          {msg.sources.map((source, index) => {
            const type = String(source?.type || "").toLowerCase();
            const chipStyle =
              type === "pubmed"
                ? {
                    background: "rgba(59,130,246,0.16)",
                    border: "1px solid rgba(59,130,246,0.45)",
                    color: "#93c5fd",
                  }
                : type === "guideline"
                  ? {
                      background: "rgba(34,197,94,0.16)",
                      border: "1px solid rgba(34,197,94,0.45)",
                      color: "#86efac",
                    }
                  : {
                      background: "rgba(148,163,184,0.16)",
                      border: "1px solid rgba(148,163,184,0.45)",
                      color: "#cbd5e1",
                    };

            const label =
              type === "pubmed"
                ? "PubMed"
                : type === "guideline"
                  ? "Guidelines"
                  : "FDA";

            const commonClass =
              "text-[10px] leading-none px-2 py-1 rounded-full font-bold";

            if (source?.url) {
              return (
                <a
                  key={`${label}-${index}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className={commonClass}
                  style={chipStyle}
                  title={source.label || label}
                >
                  {label}
                </a>
              );
            }

            return (
              <span
                key={`${label}-${index}`}
                className={commonClass}
                style={chipStyle}
                title={source?.label || label}
              >
                {label}
              </span>
            );
          })}
        </div>
      )}

      {showFollowUps &&
        Array.isArray(msg.followUps) &&
        msg.followUps.length > 0 && (
          <div className="pl-1">
            <p
              className="text-[10px] font-semibold mb-2"
              style={{ color: "#64748b" }}
            >
              You might also ask:
            </p>
            <div className="flex flex-wrap gap-2">
              {msg.followUps.map((followUp) => (
                <button
                  key={followUp}
                  type="button"
                  onClick={() => onFollowUpClick(followUp)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid #1e2d42",
                    color: "#64748b",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,188,212,0.5)";
                    e.currentTarget.style.color = "#00bcd4";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#1e2d42";
                    e.currentTarget.style.color = "#64748b";
                  }}
                >
                  {followUp}
                </button>
              ))}
            </div>
          </div>
        )}

      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 pl-1">
        <span
          className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={
            msg.emergency
              ? { background: "rgba(239,68,68,0.22)", color: "#fca5a5" }
              : String(msg.confidenceLevel || "")
                    .toLowerCase()
                    .includes("service temporarily unavailable")
                ? { background: "rgba(239,68,68,0.2)", color: "#fca5a5" }
                : String(msg.confidenceLevel || "")
                      .toLowerCase()
                      .includes("mcp verified")
                  ? { background: "rgba(249,115,22,0.2)", color: "#fdba74" }
                  : String(msg.confidenceLevel || "")
                        .toLowerCase()
                        .includes("verified")
                    ? { background: "rgba(34,197,94,0.18)", color: "#86efac" }
                    : String(msg.confidenceLevel || "")
                          .toLowerCase()
                          .includes("ai generated")
                      ? {
                          background: "rgba(245,158,11,0.18)",
                          color: "#fcd34d",
                        }
                      : {
                          background: "rgba(0,188,212,0.12)",
                          color: "#00bcd4",
                        }
          }
        >
          {msg.emergency ? "Emergency" : msg.confidenceLevel || "AI Generated"}
        </span>
        <span className="text-[10px]" style={{ color: "#334155" }}>
          {DISCLAIMER}
        </span>
      </div>
    </div>
  </div>
);

/* ─── User message ──────────────────────────────────────────────────────── */
const UserMessage = ({ msg }) => (
  <div className="flex justify-end">
    <div
      className="max-w-[72%] px-5 py-3.5 text-sm font-medium leading-relaxed"
      style={{
        background: "linear-gradient(135deg,#0097a7 0%,#00bcd4 100%)",
        color: "#001a1e",
        borderRadius: "18px 4px 18px 18px",
        boxShadow: "0 4px 16px rgba(0,188,212,0.25)",
      }}
    >
      {msg.text}
    </div>
  </div>
);

/* ─── Typing indicator ───────────────────────────────────────────────────── */
const TypingIndicator = () => (
  <div className="flex gap-3 items-start">
    <div
      className="size-8 rounded-xl flex items-center justify-center shrink-0"
      style={{
        background: "linear-gradient(135deg,#00bcd4 0%,#0097a7 100%)",
        boxShadow: "0 0 12px rgba(0,188,212,0.35)",
      }}
    >
      <span
        className="material-symbols-outlined text-white font-black"
        style={{ fontSize: "16px" }}
      >
        medical_services
      </span>
    </div>
    <div
      className="px-5 py-4 flex items-center gap-2"
      style={{
        background: "#13192a",
        border: "1px solid #1e2d42",
        borderRadius: "4px 18px 18px 18px",
      }}
    >
      <span
        className="size-2 rounded-full animate-bounce"
        style={{ background: "#00bcd4", animationDelay: "0ms" }}
      />
      <span
        className="size-2 rounded-full animate-bounce"
        style={{ background: "#00bcd4", animationDelay: "150ms" }}
      />
      <span
        className="size-2 rounded-full animate-bounce"
        style={{ background: "#00bcd4", animationDelay: "300ms" }}
      />
      <span className="text-xs ml-1" style={{ color: "#475569" }}>
        Analyzing your query…
      </span>
    </div>
  </div>
);

/* ─── Welcome screen ────────────────────────────────────────────────────── */
const WelcomeScreen = ({ onChipClick }) => (
  <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-12 px-4">
    <div
      className="size-24 rounded-3xl flex items-center justify-center"
      style={{
        background: "rgba(0,188,212,0.1)",
        border: "1px solid rgba(0,188,212,0.25)",
        boxShadow: "0 0 40px rgba(0,188,212,0.12)",
      }}
    >
      <span
        className="material-symbols-outlined font-black"
        style={{ fontSize: "48px", color: "#00bcd4" }}
      >
        psychology
      </span>
    </div>
    <div className="space-y-2">
      <h2 className="text-2xl font-black text-white tracking-tight">
        Ask me anything about your medicines
      </h2>
      <p className="text-sm font-medium" style={{ color: "#475569" }}>
        Powered by Gemini AI · Always consult a pharmacist for final advice
      </p>
    </div>
    <div className="flex flex-wrap gap-2 justify-center max-w-xl">
      {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onChipClick(q)}
          className="px-4 py-2 rounded-full text-xs font-bold transition-all hover:scale-105"
          style={{
            background: "rgba(0,188,212,0.08)",
            border: "1px solid rgba(0,188,212,0.22)",
            color: "#00bcd4",
          }}
        >
          {q}
        </button>
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const AIHealthAssistant = () => {
  const { user } = useContext(AuthContext);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [aiProvider, setAiProvider] = useState("Groq");
  const [historyNotice, setHistoryNotice] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.loading]);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      if (!user?._id && !user?.id) return;

      try {
        const { data } = await getChatHistory();
        const historyMessages = Array.isArray(data?.messages)
          ? data.messages
          : [];

        if (!active) return;

        if (historyMessages.length > 0) {
          dispatch({
            type: "SET_MESSAGES",
            payload: historyMessages.map((msg, index) => ({
              id: `h-${msg.createdAt || Date.now()}-${index}`,
              role: msg.role,
              text: msg.text,
              confidenceLevel: msg.confidenceLevel,
              emergency: false,
              sources: Array.isArray(msg.sources) ? msg.sources : [],
              provider: msg.provider,
              followUps: [],
            })),
          });
          setHistoryNotice("Chat history loaded");
          setTimeout(() => setHistoryNotice(""), 2500);
        }
      } catch {
        // Keep silent and continue with welcome screen.
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, [user?._id, user?.id]);

  const fillInput = (question) => {
    dispatch({ type: "SET", field: "question", value: question });
    inputRef.current?.focus();
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Clear all chat history? This cannot be undone.")) {
      return;
    }

    try {
      await clearChatHistory();
      dispatch({ type: "SET_MESSAGES", payload: [] });
      setHistoryNotice("Chat history cleared");
      setTimeout(() => setHistoryNotice(""), 2500);
    } catch {
      dispatch({
        type: "ERROR",
        value: "Failed to clear chat history. Please try again.",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = state.question.trim();
    if (!q || state.loading) return;

    dispatch({
      type: "ADD_MESSAGE",
      payload: { id: `u-${Date.now()}`, role: "user", text: q },
    });
    dispatch({ type: "LOADING", value: true });
    dispatch({ type: "ERROR", value: "" });
    dispatch({ type: "SET", field: "question", value: "" });

    try {
      const { data } = await askMedicineAssistant({
        medicineName: state.medicineName.trim(),
        question: q,
        context: {
          ageGroup: state.ageGroup,
          timeOfDay: state.timeOfDay,
          language: state.language,
          otherMedicines: state.otherMedicines
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean),
        },
      });

      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: `b-${Date.now()}`,
          role: "bot",
          text: data?.answer || "Sorry, I could not process your question.",
          confidenceLevel: data?.confidenceLevel || "AI Generated",
          emergency: data?.emergency || false,
          sources: Array.isArray(data?.sources) ? data.sources : [],
          provider: data?.provider || "Groq",
          followUps: Array.isArray(data?.followUps) ? data.followUps : [],
        },
      });
      setAiProvider(data?.provider || "Groq");
    } catch {
      dispatch({
        type: "ERROR",
        value: "Failed to get a response. Please try again.",
      });
    } finally {
      dispatch({ type: "LOADING", value: false });
    }
  };

  const lastBotMessageId =
    [...state.messages].reverse().find((msg) => msg.role === "bot")?.id || null;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden font-nexus-bold"
      style={{ backgroundColor: "#0a0f1e" }}
    >
      <Navbar />

      {/* Page body fills height below navbar */}
      <main
        className="flex-1 flex flex-col items-center px-4 pb-4 min-h-0"
        style={{ paddingTop: "5.5rem" }}
      >
        <div
          className="w-full max-w-4xl flex-1 flex flex-col overflow-hidden"
          style={{ borderRadius: "24px", border: "1px solid #1a2540" }}
        >
          {/* ── HEADER BAR ── */}
          <div
            className="shrink-0 flex items-center justify-between px-6 py-4"
            style={{
              background: "#0d1424",
              borderBottom: "1px solid #1a2540",
              borderRadius: "24px 24px 0 0",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#00bcd4 0%,#0097a7 100%)",
                  boxShadow: "0 0 16px rgba(0,188,212,0.4)",
                }}
              >
                <span
                  className="material-symbols-outlined text-white font-black"
                  style={{ fontSize: "20px" }}
                >
                  medical_services
                </span>
              </div>
              <div>
                <p className="text-white font-black text-base tracking-tight leading-tight">
                  Medical Assistant
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="size-1.5 rounded-full animate-pulse"
                    style={{ background: "#22c55e" }}
                  />
                  <span
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: "#22c55e" }}
                  >
                    Online
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearHistory}
                className="size-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(15,23,42,0.8)",
                  color: "#94a3b8",
                }}
                title="Clear History"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  delete
                </span>
              </button>
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                style={{
                  border:
                    aiProvider === "none"
                      ? "1px solid rgba(239,68,68,0.5)"
                      : aiProvider === "Gemini"
                        ? "1px solid rgba(168,85,247,0.45)"
                        : "1px solid rgba(0,188,212,0.4)",
                  color:
                    aiProvider === "none"
                      ? "#fca5a5"
                      : aiProvider === "Gemini"
                        ? "#c4b5fd"
                        : "#00bcd4",
                  background:
                    aiProvider === "none"
                      ? "rgba(239,68,68,0.12)"
                      : aiProvider === "Gemini"
                        ? "rgba(168,85,247,0.12)"
                        : "rgba(0,188,212,0.08)",
                }}
              >
                <span
                  className="material-symbols-outlined font-black"
                  style={{ fontSize: "14px" }}
                >
                  {aiProvider === "none"
                    ? "warning"
                    : aiProvider === "Gemini"
                      ? "auto_awesome"
                      : "bolt"}
                </span>
                {aiProvider === "none"
                  ? "AI Unavailable"
                  : `Powered by ${aiProvider}`}
              </div>
            </div>
          </div>

          {/* ── MESSAGES AREA ── */}
          <div
            className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-5"
            style={{ background: "#0b1120" }}
          >
            {state.messages.length === 0 ? (
              <WelcomeScreen onChipClick={fillInput} />
            ) : (
              <AnimatePresence initial={false}>
                {state.messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    {msg.role === "bot" ? (
                      <BotMessage
                        msg={msg}
                        onFollowUpClick={fillInput}
                        showFollowUps={msg.id === lastBotMessageId}
                      />
                    ) : (
                      <UserMessage msg={msg} />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {historyNotice && (
              <div className="flex justify-center">
                <span
                  className="text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest"
                  style={{
                    background: "rgba(0,188,212,0.12)",
                    border: "1px solid rgba(0,188,212,0.35)",
                    color: "#22d3ee",
                  }}
                >
                  {historyNotice}
                </span>
              </div>
            )}

            {/* Typing indicator */}
            {state.loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <TypingIndicator />
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── INPUT AREA ── */}
          <div
            className="shrink-0 px-5 pt-4 pb-5 space-y-3"
            style={{
              background: "#0d1424",
              borderTop: "1px solid #1a2540",
              borderRadius: "0 0 24px 24px",
            }}
          >
            {state.error && (
              <p className="text-xs font-bold text-red-400 px-1">
                {state.error}
              </p>
            )}

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => fillInput(chip.question)}
                  className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid #1e2d42",
                    color: "#64748b",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,188,212,0.5)";
                    e.currentTarget.style.color = "#00bcd4";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#1e2d42";
                    e.currentTarget.style.color = "#64748b";
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Input + send button */}
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <input
                ref={inputRef}
                type="text"
                value={state.question}
                onChange={(e) =>
                  dispatch({
                    type: "SET",
                    field: "question",
                    value: e.target.value,
                  })
                }
                placeholder="Ask about any medicine…"
                disabled={state.loading}
                autoComplete="off"
                className="flex-1 h-12 rounded-full px-5 text-sm font-medium text-white placeholder-slate-600 outline-none transition-all disabled:opacity-50"
                style={{ background: "#070c17", border: "1.5px solid #1e2d42" }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#00bcd4";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(0,188,212,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#1e2d42";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="submit"
                disabled={state.loading || !state.question.trim()}
                className="size-12 rounded-full flex items-center justify-center transition-all disabled:opacity-35 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
                style={{
                  background: "linear-gradient(135deg,#00bcd4 0%,#0097a7 100%)",
                  boxShadow: "0 4px 16px rgba(0,188,212,0.35)",
                }}
              >
                <span
                  className="material-symbols-outlined text-white font-black"
                  style={{ fontSize: "20px" }}
                >
                  send
                </span>
              </button>
            </form>

            <p className="text-center text-[10px]" style={{ color: "#1e3050" }}>
              SwiftPharma AI · {DISCLAIMER} · Not a substitute for professional
              medical advice.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIHealthAssistant;
