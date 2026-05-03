import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import ChatMessage from "./ChatMessage";
import HealthProfileSetup from "./HealthProfileSetup";
import { useEmergencySocket } from "../hooks/useEmergencySocket";
import {
  confirmMention,
  createChatSession,
  createHealthProfile,
  endChatSession,
  getChatSession,
  getHealthProfile,
  listChatSessions,
  streamSessionMessage,
  syncProfileFromVault,
  updateHealthProfile,
} from "../services/healthCompanionService";
import { useHealthCompanion } from "../context/HealthCompanionContext";

const panelShellClass =
  "border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(8,17,35,0.92))] shadow-[0_30px_70px_rgba(8,17,35,0.42)] backdrop-blur-xl";

const HealthCompanionPanel = ({
  fullPage = false,
  onClose,
  className = "",
  compact = false,
}) => {
  const {
    isOpen,
    currentSessionId,
    setCurrentSessionId,
    increaseUnreadMentions,
    clearUnreadMentions,
    consumePrefilledMessage,
  } = useHealthCompanion();

  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionList, setSessionList] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [switchingSession, setSwitchingSession] = useState(false);
  const [mentionBanner, setMentionBanner] = useState(null);
  const [showProfile, setShowProfile] = useState(!compact);

  const messagesRef = useRef(null);

  const hasSetup = useMemo(() => {
    if (!profile) return false;
    return Boolean(
      profile.age ||
        profile.allergies?.length ||
        profile.chronicConditions?.length ||
        profile.regularMedicines?.length,
    );
  }, [profile]);

  useEmergencySocket({
    onHealthMention: (payload) => {
      if (!payload?.mentions?.length) return;
      setMentionBanner(payload);
      if (!isOpen && !fullPage) {
        increaseUnreadMentions(payload.mentions.length);
      }
    },
  });

  useEffect(() => {
    if (isOpen || fullPage) {
      clearUnreadMentions();
    }
  }, [isOpen, fullPage, clearUnreadMentions]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (compact) {
      setShowProfile(false);
      return;
    }
    if (fullPage) {
      setShowProfile(true);
    }
  }, [compact, fullPage]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [profileResponse, sessionsResponse] = await Promise.all([
          getHealthProfile(),
          listChatSessions(false),
        ]);
        setProfile(profileResponse?.profile || null);

        const availableSessions = Array.isArray(sessionsResponse?.sessions)
          ? sessionsResponse.sessions
          : [];
        setSessionList(availableSessions);

        const preferredSession =
          availableSessions.find((item) => item.isActive) ||
          availableSessions[0] ||
          null;

        if (preferredSession?._id) {
          const details = await getChatSession(preferredSession._id);
          const nextSession = details?.session || null;
          setSession(nextSession);
          setMessages(nextSession?.messages || []);
          setCurrentSessionId(String(nextSession?._id || ""));
          return;
        }

        const createdSession = await createChatSession({
          title: "New Health Chat",
        });

        const nextSession = createdSession?.session || null;
        setSession(nextSession);
        setMessages(nextSession?.messages || []);
        if (nextSession) {
          setSessionList([nextSession]);
          setCurrentSessionId(String(nextSession._id || ""));
        }
      } catch (error) {
        toast.error(error?.message || "Failed to initialize health companion");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [setCurrentSessionId]);

  useEffect(() => {
    if (!currentSessionId || loading || streaming || switchingSession) return;
    if (String(currentSessionId) === String(session?._id || "")) return;

    const syncSession = async () => {
      try {
        const response = await getChatSession(currentSessionId);
        const nextSession = response?.session || null;
        if (!nextSession) return;
        setSession(nextSession);
        setMessages(nextSession?.messages || []);
      } catch {
        // Keep current session on sync failure.
      }
    };

    syncSession();
  }, [currentSessionId, loading, streaming, switchingSession, session?._id]);

  useEffect(() => {
    const seeded = consumePrefilledMessage();
    if (seeded) {
      setInput(seeded);
    }
  }, [isOpen, fullPage, consumePrefilledMessage]);

  const refreshSessions = async (preferredSessionId = null) => {
    try {
      setSessionsLoading(true);
      const response = await listChatSessions(false);
      const nextSessions = Array.isArray(response?.sessions)
        ? response.sessions
        : [];
      setSessionList(nextSessions);

      if (!preferredSessionId || !nextSessions.length) return;

      const nextPreferred = nextSessions.find(
        (item) => String(item._id) === String(preferredSessionId),
      );

      if (!nextPreferred) return;

      const details = await getChatSession(nextPreferred._id);
      const nextSession = details?.session || null;
      if (!nextSession) return;
      setSession(nextSession);
      setMessages(nextSession?.messages || []);
      setCurrentSessionId(String(nextSession?._id || ""));
    } catch {
      // Keep current session state if refreshing metadata fails.
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleNewSession = async () => {
    if (streaming || switchingSession) return;

    try {
      setSwitchingSession(true);
      const createdSession = await createChatSession({
        title: "New Health Chat",
      });
      const nextSession = createdSession?.session || null;
      if (!nextSession?._id) return;

      setSession(nextSession);
      setMessages([]);
      setCurrentSessionId(String(nextSession._id));
      await refreshSessions(nextSession._id);
      toast.success("Started a new chat session");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to start session");
    } finally {
      setSwitchingSession(false);
    }
  };

  const handleSwitchSession = async (targetSessionId) => {
    if (!targetSessionId || streaming || switchingSession) return;
    if (String(targetSessionId) === String(session?._id || "")) return;

    try {
      setSwitchingSession(true);
      const response = await getChatSession(targetSessionId);
      const nextSession = response?.session || null;
      if (!nextSession) return;

      setSession(nextSession);
      setMessages(nextSession?.messages || []);
      setCurrentSessionId(String(nextSession._id || ""));
      await refreshSessions(nextSession._id);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to open session");
    } finally {
      setSwitchingSession(false);
    }
  };

  const saveProfile = async (payload) => {
    try {
      setSavingProfile(true);
      let response;
      if (profile?._id) {
        response = await updateHealthProfile(payload);
      } else {
        response = await createHealthProfile(payload);
      }
      setProfile(response?.profile || null);
      toast.success("Health profile saved");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save profile";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSyncVault = async () => {
    try {
      setSavingProfile(true);
      const response = await syncProfileFromVault();
      setProfile(response?.profile || null);
      toast.success("Profile synced with vault and prescriptions");
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Sync failed";
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const onSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !session?._id || streaming) return;

    const userMessage = {
      _id: `${Date.now()}-user`,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const assistantPlaceholder = {
      _id: `${Date.now()}-assistant`,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);

    try {
      await streamSessionMessage({
        sessionId: session._id,
        message: trimmed,
        onEvent: (event) => {
          if (event?.type === "token") {
            setMessages((prev) => {
              const next = [...prev];
              const lastIdx = next.length - 1;
              if (lastIdx >= 0 && next[lastIdx].role === "assistant") {
                next[lastIdx] = {
                  ...next[lastIdx],
                  content: `${next[lastIdx].content || ""}${event.token || ""}`,
                };
              }
              return next;
            });
          }

          if (event?.type === "error") {
            toast.error(event?.message || "Streaming failed");
          }
        },
      });

      const fresh = await getChatSession(session._id);
      const nextSession = fresh?.session || session;
      setSession(nextSession);
      setMessages(nextSession.messages || []);
      setCurrentSessionId(String(nextSession?._id || ""));
      await refreshSessions(nextSession?._id || session?._id || null);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send message";
      toast.error(message);
    } finally {
      setStreaming(false);
    }
  };

  const handleEndSession = async () => {
    if (!session?._id || streaming) return;

    try {
      const response = await endChatSession(session._id);
      toast.success("Session ended and summary saved");
      const nextSession = response?.session;
      if (nextSession) {
        setSession(nextSession);
        setCurrentSessionId(String(nextSession._id || ""));
      }
      await refreshSessions(nextSession?._id || session?._id || null);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to end session";
      toast.error(message);
    }
  };

  const handleConfirmMention = async (mentionText, accepted) => {
    try {
      await confirmMention({ mentionText, accepted });
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update mention");
      return false;
    }
  };

  const handleConfirmAllMentions = async (accepted) => {
    if (!mentionBanner?.mentions?.length) return;

    const outcomes = await Promise.all(
      mentionBanner.mentions.map((mention) =>
        handleConfirmMention(mention, accepted),
      ),
    );

    if (outcomes.some(Boolean)) {
      const profileResponse = await getHealthProfile();
      setProfile(profileResponse?.profile || null);
    }

    setMentionBanner(null);
    toast.success(accepted ? "Mentions saved" : "Mentions ignored");
  };

  if (loading) {
    return (
      <div
        className={`rounded-3xl ${panelShellClass} p-6 text-center text-slate-600 ${className}`}
      >
        Loading your personal health companion...
      </div>
    );
  }

  const wrapperClass = fullPage
    ? `min-h-[calc(100vh-10rem)] ${className}`
    : `fixed z-[2200] transition-all duration-300 ease-out ${
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-6 pointer-events-none"
      } ${className}`;

  return (
    <section
      className={wrapperClass}
      style={
        fullPage
          ? undefined
          : {
              right: "max(1rem, env(safe-area-inset-right))",
              bottom: "max(1rem, env(safe-area-inset-bottom))",
              width: "min(96vw, 860px)",
              maxHeight: "min(88vh, 860px)",
            }
      }
      aria-hidden={!fullPage && !isOpen}
    >
      <div
        className={`h-full rounded-[28px] ${panelShellClass} overflow-hidden min-h-0 ${
          fullPage
            ? "min-h-[70vh]"
            : "w-full h-[84vh] max-h-[84vh] md:h-[80vh] md:max-h-[80vh]"
        }`}
      >
        <div
          className={`grid h-full min-h-0 ${
            !compact && showProfile
              ? "grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]"
              : "grid-cols-1"
          }`}
        >
        {!compact && showProfile ? (
          <aside className="order-1 border-b lg:border-b-0 lg:border-r border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 overflow-y-auto max-h-[42vh] lg:max-h-none">
            <h2 className="text-lg font-black text-white">
              Health Profile
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Personalized context for safer guidance.
            </p>
            <div className="mt-4">
              <HealthProfileSetup
                initialProfile={profile}
                loading={savingProfile}
                onSave={saveProfile}
                onSyncVault={handleSyncVault}
              />
            </div>
          </aside>
        ) : null}

        <div className="order-2 flex flex-col min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(19,182,236,0.12),transparent_32%),linear-gradient(180deg,rgba(8,17,35,0.92),rgba(13,24,46,0.96))]">
          <header className="px-3 md:px-4 py-3 border-b border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base md:text-lg font-black text-white">
                Personal Health AI Companion
                </h3>
                <p className="text-xs md:text-sm text-slate-400">
                  Memory is {hasSetup ? "active" : "limited until profile setup"}.
                </p>
              </div>

              <button
                onClick={handleEndSession}
                disabled={!session?.isActive || streaming}
                className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-60"
              >
                End Session
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!compact ? (
                <button
                  type="button"
                  onClick={() => setShowProfile((prev) => !prev)}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
                >
                  {showProfile ? "Hide Profile" : "Show Profile"}
                </button>
              ) : null}
              {compact ? (
                <Link
                  to="/health-companion"
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
                >
                  Expand
                </Link>
              ) : null}
              {!fullPage && onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
                >
                  Close
                </button>
              ) : null}
            </div>
          </header>

          <div className="px-3 md:px-4 pt-2 flex flex-wrap md:flex-nowrap items-center gap-2 md:overflow-x-auto pb-1">
            <button
              type="button"
              onClick={handleNewSession}
              disabled={streaming || switchingSession}
              className="rounded-full border border-teal-600 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60"
            >
              + New Chat
            </button>

            {sessionList.slice(0, 10).map((item, index) => {
              const selected = String(item._id) === String(session?._id || "");
              const title = String(item.title || `Session ${index + 1}`).trim();
              return (
                <button
                  key={item._id || `${title}-${index}`}
                  type="button"
                  onClick={() => handleSwitchSession(item._id)}
                  disabled={streaming || switchingSession}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors disabled:opacity-60 ${
                    selected
                      ? "bg-white text-slate-900 border-white"
                      : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"
                  }`}
                  title={title}
                >
                  {title.slice(0, 24)}
                  {title.length > 24 ? "..." : ""}
                  {item.isActive ? "" : " (ended)"}
                </button>
              );
            })}
          </div>

          {sessionsLoading || switchingSession ? (
            <p className="px-3 md:px-4 mt-1 text-xs text-slate-400">Updating chat history...</p>
          ) : null}

          {mentionBanner?.mentions?.length ? (
            <div className="mx-3 md:mx-4 mt-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
              <p className="text-sm font-semibold text-amber-100">
                I detected potential health memory mentions: {mentionBanner.mentions.join(", ")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => handleConfirmAllMentions(true)}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950"
                >
                  Save Mentions
                </button>
                <button
                  onClick={() => handleConfirmAllMentions(false)}
                  className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-100"
                >
                  Ignore Mentions
                </button>
              </div>
            </div>
          ) : null}

          <div
            ref={messagesRef}
            className="mx-3 md:mx-4 mt-2 flex-1 overflow-y-auto space-y-2 rounded-xl bg-white/5 p-2.5 md:p-3 border border-white/10"
          >
            {messages.length === 0 ? (
              <p className="text-sm text-slate-400">
                Start by sharing your symptoms, questions, or medicine concerns.
              </p>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message._id || `${message.role}-${message.createdAt}`}
                  role={message.role}
                  content={message.content}
                  createdAt={message.createdAt}
                />
              ))
            )}
          </div>

          <div className="mx-3 md:mx-4 mt-2 mb-3 flex flex-col sm:flex-row gap-2">
            <textarea
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about symptoms, interactions, lifestyle, medicine safety..."
              className="w-full flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button
              onClick={onSend}
              disabled={streaming || !input.trim()}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 sm:self-auto"
            >
              {streaming ? "Streaming..." : "Send"}
            </button>
          </div>

          <p className="px-3 md:px-4 pb-3 text-xs text-slate-400">
            This companion provides educational guidance and cannot replace a licensed clinician.
          </p>
        </div>
        </div>
      </div>
    </section>
  );
};

export default HealthCompanionPanel;
