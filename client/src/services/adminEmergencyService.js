import apiClient from "./apiClient";

export const getAdminEmergencyRelays = (params = {}) =>
  apiClient.get("/admin/emergency/relays", { params });

export const getAdminEmergencyStats = () =>
  apiClient.get("/admin/emergency/stats");

export const adminCancelEmergencyRelay = (relayId, reason) =>
  apiClient.patch(`/admin/emergency/${relayId}/cancel`, { reason });

export const adminReassignEmergencyRelay = (relayId, newAgentId) =>
  apiClient.patch(`/admin/emergency/${relayId}/reassign`, { newAgentId });
