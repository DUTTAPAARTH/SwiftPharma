import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const HealthCompanionContext = createContext(null);

export const HealthCompanionProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [unreadMentions, setUnreadMentions] = useState(0);
  const [prefilledMessage, setPrefilledMessage] = useState("");

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const openWithMessage = useCallback((message) => {
    const nextMessage = String(message || "").trim();
    setPrefilledMessage(nextMessage);
    setIsOpen(true);
  }, []);

  const consumePrefilledMessage = useCallback(() => {
    const next = prefilledMessage;
    setPrefilledMessage("");
    return next;
  }, [prefilledMessage]);

  const increaseUnreadMentions = useCallback((count = 1) => {
    setUnreadMentions((prev) => prev + Math.max(1, Number(count || 1)));
  }, []);

  const clearUnreadMentions = useCallback(() => {
    setUnreadMentions(0);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      open,
      close,
      toggleOpen,
      openWithMessage,
      currentSessionId,
      setCurrentSessionId,
      unreadMentions,
      increaseUnreadMentions,
      clearUnreadMentions,
      prefilledMessage,
      consumePrefilledMessage,
    }),
    [
      isOpen,
      open,
      close,
      toggleOpen,
      openWithMessage,
      currentSessionId,
      unreadMentions,
      increaseUnreadMentions,
      clearUnreadMentions,
      prefilledMessage,
      consumePrefilledMessage,
    ],
  );

  return (
    <HealthCompanionContext.Provider value={value}>
      {children}
    </HealthCompanionContext.Provider>
  );
};

export const useHealthCompanion = () => {
  const context = useContext(HealthCompanionContext);
  if (!context) {
    throw new Error("useHealthCompanion must be used within HealthCompanionProvider");
  }
  return context;
};
