import apiClient from "./apiClient";

export const inviteCaregiver = async (data) => {
  return apiClient.post("/caregiver/invite", data);
};

export const acceptInvite = async (token) => {
  return apiClient.get(`/caregiver/accept/${token}`);
};

export const revokeCaregiver = async (linkId) => {
  return apiClient.delete(`/caregiver/${linkId}/revoke`);
};

export const getMyCaregiver = async () => {
  return apiClient.get("/caregiver/my-caregiver");
};

export const getMyPatients = async () => {
  return apiClient.get("/caregiver/my-patients");
};

export const getPatientAdherence = async (patientId) => {
  return apiClient.get(`/caregiver/patients/${patientId}/adherence`);
};

export const respondToAlert = async (alertId, response) => {
  return apiClient.post(`/caregiver/alerts/${alertId}/respond`, { response });
};

export const getPendingAlerts = async () => {
  return apiClient.get("/caregiver/alerts/pending");
};
