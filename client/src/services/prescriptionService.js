import apiClient from "./apiClient";

export const uploadPrescription = (formData) =>
  apiClient.post("/prescriptions/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const reuploadPrescription = (id, formData) =>
  apiClient.post(`/prescriptions/${id}/reupload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const validatePrescription = (id) =>
  apiClient.get(`/prescriptions/${id}/validate`);

// Updated: No longer needs userId - uses authenticated user automatically
export const fetchUserPrescriptions = () =>
  apiClient.get(`/prescriptions/my-prescriptions`);

export const fetchLatestPrescriptionStatus = () =>
  apiClient.get(`/prescriptions/my-latest`);

export const fetchPrescriptionStatusById = (id) =>
  apiClient.get(`/prescriptions/${id}/status`);

export const downloadPrescription = (id) =>
  apiClient.get(`/prescriptions/${id}/download`, { responseType: "blob" });

export const testOcr = () => apiClient.get(`/prescriptions/test-ocr`);

// Admin helpers
export const adminListPrescriptions = () =>
  apiClient.get(`/admin/prescriptions`);
export const adminReviewPrescription = (id, payload) =>
  apiClient.patch(`/prescriptions/${id}/review`, payload);
