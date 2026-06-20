import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

const SocketContext = createContext(null);

const resolveSocketUrl = () => {
  const apiBase = String(import.meta.env.VITE_API_URL || "");
  if (apiBase) {
    return apiBase.replace(/\/api\/?$/, "");
  }
  return window.location.origin;
};

export const SocketProvider = ({ children }) => {
  const { token } = useContext(AuthContext);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const eventHandlersRef = useRef(new Map());
  const reconnectCallbacksRef = useRef(new Set());

  useEffect(() => {
    if (!token) {
      // Disconnect if logged out
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return undefined;
    }

    // Create socket only once
    if (!socketRef.current) {
      const socketUrl = resolveSocketUrl();
      
      socketRef.current = io(socketUrl, {
        transports: ["websocket"],
        auth: { token },
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
        autoConnect: false,
      });

      socketRef.current.on("connect", () => {
        console.log("[Socket Context] Connected");
        setConnected(true);
        // Fire all reconnect callbacks so components re-fetch missed data
        reconnectCallbacksRef.current.forEach((cb) => cb());
      });

      socketRef.current.on("disconnect", (reason) => {
        console.log(`[Socket Context] Disconnected: ${reason}`);
        setConnected(false);
      });

      socketRef.current.connect();
    }

    return () => {
      // Don't disconnect on unmount, only when token changes
    };
  }, [token]);

  const on = (eventName, handler) => {
    if (!socketRef.current) return;

    // Store handler reference
    if (!eventHandlersRef.current.has(eventName)) {
      eventHandlersRef.current.set(eventName, new Set());
    }
    eventHandlersRef.current.get(eventName).add(handler);

    // Add listener to socket
    socketRef.current.on(eventName, handler);
  };

  const off = (eventName, handler) => {
    if (!socketRef.current) return;

    // Remove handler reference
    const handlers = eventHandlersRef.current.get(eventName);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(eventName);
      }
    }

    // Remove listener from socket
    socketRef.current.off(eventName, handler);
  };

  const emit = (eventName, data) => {
    if (!socketRef.current) return;
    socketRef.current.emit(eventName, data);
  };

  const onReconnect = useCallback((cb) => {
    reconnectCallbacksRef.current.add(cb);
    return () => reconnectCallbacksRef.current.delete(cb);
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, on, off, emit, onReconnect }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};
