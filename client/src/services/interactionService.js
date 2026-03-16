import apiClient from "./apiClient";

export const checkCartInteractions = async (medicineNames = []) => {
  const response = await apiClient.post("/interactions/check", {
    medicineNames,
  });
  return response.data;
};
