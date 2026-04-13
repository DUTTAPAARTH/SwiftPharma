import apiClient from "./apiClient";

export const createSubscription = (data) =>
  apiClient.post("/subscriptions", data);

export const getMySubscriptions = () => apiClient.get("/subscriptions");

export const pauseSubscription = (id) =>
  apiClient.patch(`/subscriptions/${id}/pause`);

export const resumeSubscription = (id) =>
  apiClient.patch(`/subscriptions/${id}/resume`);

export const cancelSubscription = (id, reason) =>
  apiClient.patch(`/subscriptions/${id}/cancel`, { reason });

export const updateSubscription = (id, data) =>
  apiClient.patch(`/subscriptions/${id}`, data);
