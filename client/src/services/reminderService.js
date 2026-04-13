import apiClient from "./apiClient";

export const createReminder = (data) => apiClient.post("/reminders", data);

export const getMyReminders = () => apiClient.get("/reminders");

export const getTodayReminders = () => apiClient.get("/reminders/today");

export const logDose = (id, data) =>
  apiClient.post(`/reminders/${id}/log`, data);

export const updateReminder = (id, data) =>
  apiClient.patch(`/reminders/${id}`, data);

export const deleteReminder = (id) => apiClient.delete(`/reminders/${id}`);

export const getAdherenceStats = () => apiClient.get("/reminders/stats");
