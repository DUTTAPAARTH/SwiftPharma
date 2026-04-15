import apiClient from "./apiClient";

export const createRelay = (data) => apiClient.post("/emergency", data);
export const logAmbulanceCall = async (data = {}) => {
  const token = localStorage.getItem("authToken");
  const response = await fetch("/api/emergency/ambulance-call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify(data),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Failed to log ambulance call");
  }

  return payload;
};
export const claimRelay = (relayId) =>
  apiClient.patch(`/emergency/${relayId}/claim`);
export const cancelRelay = (relayId) =>
  apiClient.patch(`/emergency/${relayId}/cancel`);
export const resolveRelay = (relayId) =>
  apiClient.patch(`/emergency/${relayId}/resolve`);
export const getActiveRelay = () => apiClient.get("/emergency/active");
export const getNearbyRelays = () => apiClient.get("/emergency/nearby");
export const getRelayByToken = (token) =>
  apiClient.get(`/emergency/track/${token}`);
export const updateEmergencyContact = (data) =>
  apiClient.patch("/emergency/contact", data);
export const triageSymptoms = (data) =>
  apiClient.post("/emergency/triage", data);
export const getFallbackPharmacies = (lat, lng) =>
  apiClient.get("/emergency/fallback-pharmacies", { params: { lat, lng } });
export const getRelayHistory = (params = {}) =>
  apiClient.get("/emergency/history", { params });
export const getRelayHistoryById = (historyId) =>
  apiClient.get(`/emergency/history/${historyId}`);
export const reorderRelayHistory = (historyId) =>
  apiClient.post(`/emergency/history/${historyId}/reorder`);
