import Prescription from "../models/Prescription.js";
import { getPrescriptionLifecycleState } from "../utils/prescriptionLifecycle.js";

export const getMyLatestPrescription = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Please log in to view prescriptions",
        code: "AUTH_REQUIRED",
      });
    }

    const latest = await Prescription.findOne({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    if (!latest) {
      return res.json({
        success: true,
        exists: false,
        prescription: null,
      });
    }

    const lifecycle = getPrescriptionLifecycleState(latest.toObject());

    if (
      latest.status !== lifecycle.status ||
      latest.isExpired !== lifecycle.isExpired ||
      String(latest.expiryDate || "") !== String(lifecycle.expiryDate || "")
    ) {
      latest.status = lifecycle.status;
      latest.isExpired = lifecycle.isExpired;
      latest.expiryDate = lifecycle.expiryDate;
      await latest.save();
    }

    return res.json({
      success: true,
      exists: true,
      prescription: latest,
    });
  } catch (error) {
    console.error("getMyLatestPrescription error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch latest prescription",
    });
  }
};
