import apiClient from "./apiClient";

export const fetchOrderTracking = (orderId) =>
  apiClient.get(`/orders/${orderId}/tracking`);

export const assignOrderDeliveryAgent = (orderId, agentName) =>
  apiClient.post(`/orders/${orderId}/assign-agent`, { agentName });

export const updateOrderTracking = (orderId, payload) =>
  apiClient.patch(`/orders/${orderId}/tracking`, payload);
