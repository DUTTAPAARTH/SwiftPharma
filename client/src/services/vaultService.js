import apiClient from "./apiClient";

export const getVault = () => apiClient.get("/vault");
export const addVaultItem = (data) => apiClient.post("/vault", data);
export const updateVaultItem = (id, data) =>
  apiClient.patch(`/vault/${id}`, data);
export const deleteVaultItem = (id) => apiClient.delete(`/vault/${id}`);
export const getReadiness = () => apiClient.get("/vault/readiness");
export const reorderVaultItem = (id) => apiClient.post(`/vault/${id}/reorder`);
