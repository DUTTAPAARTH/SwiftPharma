import React, { createContext, useCallback, useMemo, useState } from "react";
import {
  uploadPrescription as uploadRx,
  reuploadPrescription as reuploadRx,
  validatePrescription as validateRx,
  fetchUserPrescriptions,
} from "../services/prescriptionService";

export const PrescriptionContext = createContext();

export const PrescriptionProvider = ({ children }) => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [activePrescription, setActivePrescription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPrescriptions = useCallback(async (userId) => {
    const resolvedUser =
      userId || JSON.parse(localStorage.getItem("user") || "{}")._id;
    if (!resolvedUser) return;
    setLoading(true);
    try {
      const { data } = await fetchUserPrescriptions(resolvedUser);
      setPrescriptions(data);
      const firstValid = data.find(
        (p) => !p.isExpired && p.status !== "rejected"
      );
      if (firstValid) setActivePrescription(firstValid);
    } catch (err) {
      setError("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  const upload = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await uploadRx(payload);
      // refetch list if userId present in payload
      return data;
    } catch (err) {
      setError("Upload failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reupload = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await reuploadRx(id, payload);
      return data;
    } catch (err) {
      setError("Re-upload failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const validate = useCallback(async (id) => {
    if (!id) return { valid: false };
    try {
      const { data } = await validateRx(id);
      return data;
    } catch (err) {
      return { valid: false, message: "Validation failed" };
    }
  }, []);

  const value = useMemo(
    () => ({
      prescriptions,
      activePrescription,
      setActivePrescription,
      loadPrescriptions,
      upload,
      reupload,
      validate,
      loading,
      error,
    }),
    [
      prescriptions,
      activePrescription,
      loadPrescriptions,
      upload,
      reupload,
      validate,
      loading,
      error,
    ]
  );

  return (
    <PrescriptionContext.Provider value={value}>
      {children}
    </PrescriptionContext.Provider>
  );
};
