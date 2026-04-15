import apiClient from "./apiClient";

export const logDose = async (data) => {
  return apiClient.post("/doses/log", data);
};

export const getDoseLogs = async (params = {}) => {
  return apiClient.get("/doses", { params });
};
