import DoseLog from "../models/DoseLog.js";
import Notification from "../models/Notification.js";
import Reminder from "../models/Reminder.js";

export const logDose = async (req, res) => {
  try {
    const { reminderId, status, scheduledAt } = req.body || {};

    if (!reminderId || !status || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: "reminderId, status, and scheduledAt are required",
      });
    }

    if (!["taken", "missed", "skipped"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be 'taken', 'missed', or 'skipped'",
      });
    }

    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Reminder not found",
      });
    }

    if (String(reminder.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const log = await DoseLog.create({
      reminderId,
      patientId: req.user._id,
      medicineName: reminder.medicineName,
      scheduledAt: new Date(scheduledAt),
      status,
      takenAt: status === "taken" ? new Date() : null,
      loggedAt: new Date(),
    });

    if (status === "taken") {
      await Reminder.updateOne(
        { _id: reminderId },
        { $set: { lastAcknowledgedAt: new Date() } },
      );
    }

    return res.status(201).json({ success: true, log });
  } catch (error) {
    console.error("logDose error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to log dose",
    });
  }
};

export const getDoseLogs = async (req, res) => {
  try {
    const days = Math.max(1, Math.min(365, Number(req.query.days || 7)));
    const reminderId = req.query.reminderId?.trim() || null;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const filter = {
      patientId: req.user._id,
      scheduledAt: { $gte: since },
    };

    if (reminderId) {
      filter.reminderId = reminderId;
    }

    const logs = await DoseLog.find(filter).sort({ scheduledAt: -1 }).lean();

    return res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("getDoseLogs error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dose logs",
    });
  }
};
