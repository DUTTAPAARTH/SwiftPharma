import apiClient from "./apiClient";

export const askMedicineAssistant = (payload) =>
  apiClient.post("/assistant/medicine", payload);
