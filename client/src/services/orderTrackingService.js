import apiClient from "./apiClient";

export const getActiveTracking = () => apiClient.get("/orders/active-tracking");

export const getAgentLocation = (orderId) =>
  apiClient.get(`/orders/${orderId}/agent-location`);
