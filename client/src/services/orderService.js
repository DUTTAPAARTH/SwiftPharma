import apiClient from "./apiClient";

export const fetchOrders = () => apiClient.get("/orders");
export const fetchMyOrders = () => apiClient.get("/orders/my-orders");
export const createOrder = (payload) => apiClient.post("/orders", payload);
