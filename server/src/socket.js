import { Server } from "socket.io";
import { verifyToken } from "./config/jwt.js";
import { ROLES } from "./utils/constants.js";

let ioInstance = null;
export const connectedUsers = new Map();
const agentSockets = new Map();
const socketToUser = new Map();

const getAllowedOrigins = () => {
  const raw = process.env.CLIENT_URL || "http://localhost:5173";
  return raw.split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean);
};

export const initSocket = (httpServer) => {
  const allowedOrigins = getAllowedOrigins();
  console.log("[socket] Allowed origins:", allowedOrigins);
  console.log("[socket] Initializing Socket.IO server...");
  
  ioInstance = new Server(httpServer, {
    transports: ["polling", "websocket"],
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, same-origin)
        if (!origin) {
          return callback(null, true);
        }
        
        const normalizedOrigin = origin.replace(/\/$/, "");
        if (allowedOrigins.includes(normalizedOrigin)) {
          return callback(null, true);
        }
        
        // Only log when blocking (error case)
        console.error(`[socket] ✗ CORS blocked origin: ${origin}`);
        console.error(`[socket] Allowed origins are: ${allowedOrigins.join(", ")}`);
        callback(new Error(`Socket CORS: origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    // Handle connection errors gracefully
    connectTimeout: 45000,
    // Allow reconnection with same session
    cookie: false,
  });

  // Log connection errors (suppress code 1 = "Session ID unknown" which is expected during reconnection)
  ioInstance.engine.on("connection_error", (err) => {
    if (err.code === 1) return; // Normal: old clients reconnecting after server restart
    console.error("[socket] Connection error:", err.code, err.message);
  });

  ioInstance.on("connection", (socket) => {
    console.log(`[socket] Client connected: ${socket.id}`);
    const token = socket.handshake?.auth?.token;
    let authenticatedUserId = null;

    if (token) {
      try {
        const decoded = verifyToken(token);
        const userId = String(decoded._id || decoded.id || "");
        if (userId) {
          const role = String(decoded.role || "").toLowerCase();
          authenticatedUserId = userId;
          connectedUsers.set(userId, {
            socketId: socket.id,
            role,
          });
          socketToUser.set(socket.id, userId);
          socket.join(`user:${userId}`);
          if (role === ROLES.ADMIN) {
            socket.join("emergency:ops");
          }
        }
      } catch (error) {
        console.warn("[socket] auth token verification failed", error.message);
      }
    }

    socket.join("emergency:broadcast");

    socket.on("agent:register", (payload = {}) => {
      const agentId = String(
        payload.agentId || authenticatedUserId || payload.userId || "",
      );
      if (!agentId) return;
      agentSockets.set(agentId, socket.id);
      socket.join("delivery:agents");
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] Client disconnected: ${socket.id}, reason: ${reason}`);
      const userId = socketToUser.get(socket.id);
      if (userId) {
        const existing = connectedUsers.get(userId);
        if (existing?.socketId === socket.id) {
          connectedUsers.delete(userId);
        }
      }
      socketToUser.delete(socket.id);

      for (const [agentId, socketId] of agentSockets.entries()) {
        if (socketId === socket.id) {
          agentSockets.delete(agentId);
        }
      }
    });
  });

  return ioInstance;
};

export const broadcastEmergency = (relayDoc) => {
  if (!ioInstance || !relayDoc) return;

  const payload = {
    relay: relayDoc,
    relayId: relayDoc._id,
    status: relayDoc.status,
  };

  const nearbyIds = new Set(
    (relayDoc?.nearbyAgentUserIds || []).map((id) => String(id)),
  );

  for (const [userId, meta] of connectedUsers.entries()) {
    if (meta?.role !== ROLES.DELIVERY || !meta?.socketId) continue;
    if (nearbyIds.size > 0 && !nearbyIds.has(String(userId))) continue;
    ioInstance.to(meta.socketId).emit("emergency:new", payload);
  }

  ioInstance.to("emergency:ops").emit("emergency:new", payload);
  ioInstance.to("emergency:broadcast").emit("emergency:broadcast", payload);
};

export const broadcastEmergencyTo = (relayDoc, nearbyAgentUserIds = []) => {
  if (!relayDoc) return;
  broadcastEmergency({ ...relayDoc, nearbyAgentUserIds });
};

export const notifyRelayClaimed = (relayDoc) => {
  if (!ioInstance || !relayDoc?.userId) return;
  ioInstance
    .to(`user:${String(relayDoc.userId)}`)
    .emit("emergency:claimed", { relay: relayDoc });
  ioInstance.to("emergency:ops").emit("emergency:claimed", { relay: relayDoc });
};

export const emitRelayUpdate = (relayDoc) => {
  if (!ioInstance || !relayDoc) return;
  ioInstance.to("emergency:ops").emit("emergency:updated", { relay: relayDoc });
};

export const emitToUser = (userId, eventName, payload) => {
  if (!ioInstance || !userId || !eventName) return;
  ioInstance.to(`user:${String(userId)}`).emit(eventName, payload);
};

export const getIO = () => ioInstance;

