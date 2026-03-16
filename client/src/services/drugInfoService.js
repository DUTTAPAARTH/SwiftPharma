import apiClient from "./apiClient";

export const fetchDrugInfo = async (medicineName) => {
  const response = await apiClient.get(
    `/drug-info/${encodeURIComponent(medicineName)}`,
  );
  return response.data;
};
