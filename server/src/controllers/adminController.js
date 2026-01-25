import Prescription from "../models/Prescription.js";

export const adminDashboard = async (req, res) => {
  const pending = await Prescription.countDocuments({ status: "pending" });
  return res.json({ stats: { pendingPrescriptions: pending } });
};

export const adminListPrescriptions = async (req, res) => {
  const data = await Prescription.find().sort({ createdAt: -1 });
  return res.json(data);
};
