import { useEffect } from "react";
import { useSocket } from "../context/SocketContext";

export const useEmergencySocket = ({
  onClaimed,
  onCancelled,
  onEscalated,
  onUpdated,
  onFallback,
  onDoseMissed,
  onCaregiverNotify,
  onHelpRequested,
  onPrescriptionUpdate,
  onHealthMention,
  onAmbulanceCalled,
} = {}) => {
  const { connected, on, off } = useSocket();

  useEffect(() => {
    if (!connected) return undefined;

    const handleClaimed = (payload) => {
      if (typeof onClaimed === "function") {
        onClaimed(payload?.relay || null);
      }
    };

    const handleCancelled = (payload) => {
      if (typeof onCancelled === "function") {
        onCancelled(payload?.relay || null);
      }
    };

    const handleUpdated = (payload) => {
      if (typeof onUpdated === "function") {
        onUpdated(payload?.relay || null);
      }
    };

    const handleEscalated = (payload) => {
      if (typeof onEscalated === "function") {
        onEscalated(payload || null);
      }
    };

    const handleFallback = (payload) => {
      if (typeof onFallback === "function") {
        onFallback(payload || null);
      }
    };

    const handleDoseMissed = (payload) => {
      if (typeof onDoseMissed === "function") {
        onDoseMissed(payload || null);
      }
    };

    const handleCaregiverNotify = (payload) => {
      if (typeof onCaregiverNotify === "function") {
        onCaregiverNotify(payload || null);
      }
    };

    const handleHelpRequested = (payload) => {
      if (typeof onHelpRequested === "function") {
        onHelpRequested(payload || null);
      }
    };

    const handlePrescriptionUpdate = (payload) => {
      if (typeof onPrescriptionUpdate === "function") {
        onPrescriptionUpdate(payload || null);
      }
    };

    const handleHealthMention = (payload) => {
      if (typeof onHealthMention === "function") {
        onHealthMention(payload || null);
      }
    };

    const handleAmbulanceCalled = (payload) => {
      if (typeof onAmbulanceCalled === "function") {
        onAmbulanceCalled(payload || null);
      }
    };

    // Register all handlers
    if (onClaimed) on("emergency:claimed", handleClaimed);
    if (onCancelled) on("emergency:cancelled", handleCancelled);
    if (onUpdated) on("emergency:updated", handleUpdated);
    if (onEscalated) on("emergency:escalated", handleEscalated);
    if (onFallback) on("emergency:fallback", handleFallback);
    if (onDoseMissed) on("alert:dose_missed", handleDoseMissed);
    if (onCaregiverNotify) on("alert:caregiver_notify", handleCaregiverNotify);
    if (onHelpRequested) on("alert:help_requested", handleHelpRequested);
    if (onPrescriptionUpdate) on("prescription:update", handlePrescriptionUpdate);
    if (onHealthMention) on("chat:health_mention_found", handleHealthMention);
    if (onAmbulanceCalled) on("ambulance_called", handleAmbulanceCalled);

    return () => {
      // Clean up all handlers
      if (onClaimed) off("emergency:claimed", handleClaimed);
      if (onCancelled) off("emergency:cancelled", handleCancelled);
      if (onUpdated) off("emergency:updated", handleUpdated);
      if (onEscalated) off("emergency:escalated", handleEscalated);
      if (onFallback) off("emergency:fallback", handleFallback);
      if (onDoseMissed) off("alert:dose_missed", handleDoseMissed);
      if (onCaregiverNotify) off("alert:caregiver_notify", handleCaregiverNotify);
      if (onHelpRequested) off("alert:help_requested", handleHelpRequested);
      if (onPrescriptionUpdate) off("prescription:update", handlePrescriptionUpdate);
      if (onHealthMention) off("chat:health_mention_found", handleHealthMention);
      if (onAmbulanceCalled) off("ambulance_called", handleAmbulanceCalled);
    };
  }, [
    connected,
    on,
    off,
    onClaimed,
    onCancelled,
    onUpdated,
    onEscalated,
    onFallback,
    onDoseMissed,
    onCaregiverNotify,
    onHelpRequested,
    onPrescriptionUpdate,
    onHealthMention,
    onAmbulanceCalled,
  ]);

  return { connected };
};
