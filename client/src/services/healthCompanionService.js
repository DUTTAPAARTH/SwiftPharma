import apiClient from "./apiClient";

const getStreamBaseUrl = () => {
  const apiBase = String(import.meta.env.VITE_API_URL || "").trim();
  if (!apiBase) {
    return "/api";
  }
  const normalized = apiBase.replace(/\/+$/, "");
  if (normalized.endsWith("/api")) {
    return normalized;
  }
  return `${normalized}/api`;
};

export const getHealthProfile = async () => {
  const response = await apiClient.get("/health-profile");
  return response.data;
};

export const createHealthProfile = async (payload) => {
  const response = await apiClient.post("/health-profile", payload);
  return response.data;
};

export const updateHealthProfile = async (payload) => {
  const response = await apiClient.patch("/health-profile", payload);
  return response.data;
};

export const syncProfileFromVault = async () => {
  const response = await apiClient.post("/health-profile/sync-vault");
  return response.data;
};

export const confirmMention = async ({ mentionText, accepted }) => {
  const response = await apiClient.post("/health-profile/confirm-mention", {
    mentionText,
    accepted,
  });
  return response.data;
};

export const createChatSession = async (payload = {}) => {
  const response = await apiClient.post("/chat/sessions", payload);
  return response.data;
};

export const listChatSessions = async (active = false) => {
  const response = await apiClient.get("/chat/sessions", {
    params: { active },
  });
  return response.data;
};

export const getChatSession = async (sessionId) => {
  const response = await apiClient.get(`/chat/sessions/${sessionId}`);
  return response.data;
};

export const endChatSession = async (sessionId) => {
  const response = await apiClient.post(`/chat/sessions/${sessionId}/end`);
  return response.data;
};

const parseSseChunk = (chunk, onEvent) => {
  const lines = chunk.split("\n");
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;

    try {
      const parsed = JSON.parse(payload);
      onEvent(parsed);
    } catch {
      onEvent({ type: "error", message: "Invalid stream payload" });
    }
  }
};

export const streamSessionMessage = async ({ sessionId, message, onEvent }) => {
  const token = localStorage.getItem("authToken");
  const streamBaseUrl = getStreamBaseUrl();

  const response = await fetch(`${streamBaseUrl}/chat/sessions/${sessionId}/message`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    let details = "Unable to stream assistant response";
    try {
      const errorBody = await response.json();
      details = errorBody?.message || details;
    } catch {
      // Ignore parse failures and use default details.
    }
    throw new Error(details);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      parseSseChunk(block, onEvent);
    }
  }

  if (buffer.trim()) {
    parseSseChunk(buffer, onEvent);
  }
};
