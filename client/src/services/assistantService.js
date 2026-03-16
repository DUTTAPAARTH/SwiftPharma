import apiClient from "./apiClient";

export const askMedicineAssistant = (payload) =>
  apiClient.post("/assistant/ask", payload);

export const getChatHistory = () => apiClient.get("/assistant/history");

export const clearChatHistory = () => apiClient.delete("/assistant/history");
