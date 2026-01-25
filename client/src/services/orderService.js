import apiClient from "./apiClient";

export const fetchOrders = () => apiClient.get("/orders");
export const createOrder = (payload) => apiClient.post("/orders", payload);
