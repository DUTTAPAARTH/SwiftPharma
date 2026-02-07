import React, { useContext, useReducer, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { AuthContext } from "../context/AuthContext";
import { askMedicineAssistant } from "../services/assistantService";
import ChatHeader from "../components/ai/ChatHeader";
import ChatMessages from "../components/ai/ChatMessages";
import TypingIndicator from "../components/ai/TypingIndicator";
import QuickChips from "../components/ai/QuickChips";
import AdvancedOptions from "../components/ai/AdvancedOptions";
import DisclaimerModal from "../components/ai/DisclaimerModal";

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
    case "LOADING":
      return { ...state, loading: action.value };
    case "ERROR":
      return { ...state, error: action.value };
    default:
      return state;
  }
}

const AIHealthAssistant = () => {
  const { user } = useContext(AuthContext);
  const [state, dispatch] = useReducer(reducer, initialState);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.loading]);

  const handleChipClick = (chipText) => {
    if (chipText.includes("Missed")) {
      dispatch({
        type: "SET",
        field: "question",
        value: "I missed a dose. What should I do?",
      });
    } else if (chipText.includes("Side effects")) {
      dispatch({
        type: "SET",
        field: "question",
        value: "What are the common side effects?",
      });
    } else if (chipText.includes("Talk to pharmacist")) {
      dispatch({
        type: "SET",
        field: "question",
        value: "I want to speak with a pharmacist.",
      });
    } else {
      dispatch({
        type: "SET",
        field: "question",
        value: "When and how should I take this medicine?",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!state.question.trim()) {
      dispatch({ type: "ERROR", value: "Please enter your question." });
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: state.question.trim(),
    };

    dispatch({ type: "ADD_MESSAGE", payload: userMessage });
    dispatch({ type: "LOADING", value: true });
    const currentQuestion = state.question.trim();
    dispatch({ type: "SET", field: "question", value: "" });
    dispatch({ type: "ERROR", value: "" });

    try {
      const { data } = await askMedicineAssistant({
        medicineName: state.medicineName.trim(),
        question: currentQuestion,
        context: {
          ageGroup: state.ageGroup,
          timeOfDay: state.timeOfDay,
          language: state.language,
          otherMedicines: state.otherMedicines
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
      });

      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: `bot-${Date.now()}`,
          role: "bot",
          text: data?.answer || "",
          medicineCard: data?.medicineCard || null,
          confidenceIcon: data?.confidenceIcon || "",
          confidenceLevel: data?.confidenceLevel || "",
          emergency: data?.emergency || false,
          interactionWarning: data?.interactionWarning || false,
          showPharmacistCTA: data?.showPharmacistCTA || false,
        },
      });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to get a response. Please try again.";
      dispatch({ type: "ERROR", value: message });
    } finally {
      dispatch({ type: "LOADING", value: false });
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <motion.div
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <ChatHeader
            onInfo={() =>
              dispatch({ type: "SET", field: "showDisclaimer", value: true })
            }
          />

          <ChatMessages
            messages={state.messages}
            user={user}
            bottomRef={bottomRef}
          />

          {state.loading && <TypingIndicator />}

          {(!state.messages.length ||
            state.messages[state.messages.length - 1]?.role === "bot") &&
            !state.loading && <QuickChips onSelect={handleChipClick} />}

          <form
            onSubmit={handleSubmit}
            className="bg-white border-t border-border px-6 py-5"
          >
            <div className="flex items-center gap-4 mb-5">
              <button
                type="button"
                className="w-12 h-12 rounded-full text-2xl flex items-center justify-center hover:bg-primarySoft transition-colors"
                style={{ border: "2px solid rgb(226, 232, 240)" }}
                aria-label="Voice input"
              >
                🎤
              </button>
              <input
                type="text"
                value={state.question}
                onChange={(e) =>
                  dispatch({
                    type: "SET",
                    field: "question",
                    value: e.target.value,
                  })
                }
                placeholder="Ask about dosage, food, or missed dose…"
                className="flex-1 rounded-2xl px-5 py-4 text-base shadow border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-textPrimary placeholder:text-textSecondary"
              />
              <button
                type="submit"
                disabled={state.loading || !state.question.trim()}
                className="w-14 h-14 rounded-full text-white font-bold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:scale-100 bg-primary"
              >
                ➤
              </button>
            </div>

            {state.error && (
              <div className="mb-4 rounded-2xl border border-danger bg-danger/10 text-danger px-4 py-3 text-sm font-medium">
                {state.error}
              </div>
            )}
          </form>

          <AdvancedOptions state={state} dispatch={dispatch} />
        </motion.div>
      </main>

      <Footer />

      {state.showDisclaimer && (
        <DisclaimerModal
          onClose={() =>
            dispatch({ type: "SET", field: "showDisclaimer", value: false })
          }
        />
      )}
    </div>
  );
};

export default AIHealthAssistant;
