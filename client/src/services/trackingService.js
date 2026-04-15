import apiClient from "./apiClient";

export const fetchOrderTracking = (orderId) =>
  apiClient.get(`/orders/${orderId}/tracking`);

export const assignOrderDeliveryAgent = (
  orderId,
  agentName,
  options = {},
) =>
  apiClient.post(`/orders/${orderId}/assign-agent`, {
    agentName,
    ...options,
  });

export const updateOrderTracking = (orderId, payload) =>
  apiClient.patch(`/orders/${orderId}/tracking`, payload);
