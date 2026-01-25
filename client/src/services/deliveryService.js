import apiClient from "./apiClient";

export const fetchAssignedOrders = () => apiClient.get("/delivery/orders");
export const updateDeliveryStatus = (orderId, status) =>
  apiClient.patch(`/delivery/orders/${orderId}`, { status });
