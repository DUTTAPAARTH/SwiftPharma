import { useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";

const resolveSocketUrl = () => {
  const apiBase = String(import.meta.env.VITE_API_URL || "");
  if (apiBase) {
    return apiBase.replace(/\/api\/?$/, "");
  }
  return window.location.origin;
};

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
  const { token } = useContext(AuthContext);
  const [connected, setConnected] = useState(false);

  const socketUrl = useMemo(resolveSocketUrl, []);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(socketUrl, {
      transports: ["polling"],
      auth: { token },
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      autoConnect: false, // Prevent immediate connection
    });

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("emergency:claimed", (payload) => {
      if (typeof onClaimed === "function") {
        onClaimed(payload?.relay || null);
      }
    });

    socket.on("emergency:cancelled", (payload) => {
      if (typeof onCancelled === "function") {
        onCancelled(payload?.relay || null);
      }
    });

    socket.on("emergency:updated", (payload) => {
      if (typeof onUpdated === "function") {
        onUpdated(payload?.relay || null);
      }
    });

    socket.on("emergency:escalated", (payload) => {
      if (typeof onEscalated === "function") {
        onEscalated(payload || null);
      }
    });

    socket.on("emergency:fallback", (payload) => {
      if (typeof onFallback === "function") {
        onFallback(payload || null);
      }
    });

    socket.on("alert:dose_missed", (payload) => {
      if (typeof onDoseMissed === "function") {
        onDoseMissed(payload || null);
      }
    });

    socket.on("alert:caregiver_notify", (payload) => {
      if (typeof onCaregiverNotify === "function") {
        onCaregiverNotify(payload || null);
      }
    });

    socket.on("alert:help_requested", (payload) => {
      if (typeof onHelpRequested === "function") {
        onHelpRequested(payload || null);
      }
    });

    socket.on("prescription:update", (payload) => {
      if (typeof onPrescriptionUpdate === "function") {
        onPrescriptionUpdate(payload?.relay || null);
      }
    });

    socket.on("chat:health_mention_found", (payload) => {
      if (typeof onHealthMention === "function") {
        onHealthMention(payload || null);
      }
    });

    socket.on("ambulance_called", (payload) => {
      if (typeof onAmbulanceCalled === "function") {
        onAmbulanceCalled(payload || null);
      }
    });

    // Connect after all listeners are set up
    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [token, socketUrl]); // Only re-run if token or socketUrl changes

  return { connected };
};
