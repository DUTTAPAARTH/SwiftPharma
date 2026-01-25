import apiClient from "./apiClient";

export const scanPrescription = (formData) =>
  apiClient.post("/ai/scan-prescription", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const retryExtraction = (ocrText) =>
  apiClient.post("/ai/retry-extraction", { ocrText });

export const addBulkToCart = (items) =>
  apiClient.post("/cart/add-bulk", { items });
