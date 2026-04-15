import CaregiverLink from "../models/CaregiverLink.js";
import DoseLog from "../models/DoseLog.js";
import EscalationAlert from "../models/EscalationAlert.js";
import Notification from "../models/Notification.js";
import Reminder from "../models/Reminder.js";
import User from "../models/User.js";
import { emitToUser, getIO } from "../socket.js";

const PHONE_REGEX = /^[6-9]\d{9}$/;

export const inviteCaregiver = async (req, res) => {
  try {
    const { caregiverName, caregiverPhone } = req.body || {};

    const name = String(caregiverName || "").trim();
    const phone = String(caregiverPhone || "").trim();

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Caregiver name and phone are required",
      });
    }

    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone must be 10 digits starting with 6-9",
      });
    }

    const existing = await CaregiverLink.findOne({
      patientId: req.user._id,
      status: "active",
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Caregiver already linked. Revoke first.",
      });
    }

    const link = await CaregiverLink.create({
      patientId: req.user._id,
      caregiverName: name,
      caregiverPhone: phone,
      status: "pending",
    });

    await Notification.create({
      userId: req.user._id,
      type: "caregiver_invite_sent",
      message: `Caregiver invite sent to ${name}`,
      data: { linkId: link._id },
    });

    return res.status(201).json({
      success: true,
      inviteToken: link.inviteToken,
      caregiverName: link.caregiverName,
      caregiverPhone: link.caregiverPhone,
    });
  } catch (error) {
    console.error("inviteCaregiver error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send caregiver invite",
    });
  }
};

export const acceptInvite = async (req, res) => {
  try {
    const link = await CaregiverLink.findOne({
      inviteToken: req.params.inviteToken,
      status: "pending",
    });

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Invite link invalid or already used",
      });
    }

    if (req.user) {
      link.caregiverId = req.user._id;
    }

    link.status = "active";
    link.acceptedAt = new Date();
    await link.save();

    if (link.caregiverId) {
      await Reminder.updateMany(
        {
          userId: link.patientId,
          isCritical: true,
          $or: [{ caregiverId: null }, { caregiverId: { $exists: false } }],
        },
        { $set: { caregiverId: link.caregiverId } },
      );
    }

    const patient = await User.findById(link.patientId).select("name");
    await Notification.create({
      userId: link.patientId,
      type: "caregiver_activated",
      message: `${link.caregiverName} is now your emergency caregiver`,
      data: { caregiverId: link.caregiverId },
    });

    return res.json({
      success: true,
      message: "Caregiver link activated",
      patientId: link.patientId,
      patientName: patient?.name || "Patient",
    });
  } catch (error) {
    console.error("acceptInvite error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to activate caregiver link",
    });
  }
};

export const revokeCaregiver = async (req, res) => {
  try {
    const link = await CaregiverLink.findById(req.params.linkId);

    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Caregiver link not found",
      });
    }

    if (String(link.patientId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    link.status = "revoked";
    await link.save();

    await Reminder.updateMany(
      {
        userId: link.patientId,
        caregiverId: link.caregiverId,
      },
      { $set: { caregiverId: null } },
    );

    return res.json({
      success: true,
      message: "Caregiver access revoked",
    });
  } catch (error) {
    console.error("revokeCaregiver error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to revoke caregiver",
    });
  }
};

export const getMyCaregiver = async (req, res) => {
  try {
    const link = await CaregiverLink.findOne({
      patientId: req.user._id,
      status: "active",
    }).populate("caregiverId", "name email");

    return res.json({
      success: true,
      caregiver: link || null,
    });
  } catch (error) {
    console.error("getMyCaregiver error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch caregiver",
    });
  }
};

export const getMyPatients = async (req, res) => {
  try {
    const links = await CaregiverLink.find({
      caregiverId: req.user._id,
      status: "active",
    }).populate("patientId", "name");

    const patients = links.map((link) => {
      const fullName = String(link.patientId?.name || "Patient").trim();
      const parts = fullName.split(" ");
      const firstName = parts[0];
      const lastInitial = parts[parts.length - 1]?.[0] || "";
      const displayName =
        lastInitial && firstName !== fullName
          ? `${firstName} ${lastInitial}.`
          : firstName;

      return {
        linkId: link._id,
        patientId: link.patientId._id,
        displayName,
      };
    });

    return res.json({
      success: true,
      patients,
    });
  } catch (error) {
    console.error("getMyPatients error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch my patients",
    });
  }
};

export const getPatientAdherence = async (req, res) => {
  try {
    const patientId = req.params.patientId;

    const auth = await CaregiverLink.findOne({
      caregiverId: req.user._id,
      patientId,
      status: "active",
    });

    if (!auth) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const logs = await DoseLog.find({
      patientId,
      scheduledAt: { $gte: thirtyDaysAgo },
    }).lean();

    if (!logs.length) {
      return res.json({
        success: true,
        adherencePercent: 0,
        streakDays: 0,
        totalDoses: 0,
        takenDoses: 0,
        missedDoses: 0,
        last7Days: [],
      });
    }

    const totalDoses = logs.length;
    const takenDoses = logs.filter((l) => l.status === "taken").length;
    const missedDoses = logs.filter((l) => l.status === "missed").length;
    const adherencePercent = Math.round((takenDoses / totalDoses) * 100);

    // Compute streak (consecutive days from today backwards with all doses taken)
    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = checkDate.toISOString().split("T")[0];

      const dayLogs = logs.filter((l) => {
        const logDateStr = new Date(l.scheduledAt).toISOString().split("T")[0];
        return logDateStr === checkDateStr;
      });

      if (!dayLogs.length) {
        if (i === 0) continue;
        break;
      }

      const allTaken = dayLogs.every((l) => l.status === "taken");
      if (allTaken) {
        streakDays += 1;
      } else {
        break;
      }
    }

    // Last 7 days breakdown
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayLogs = logs.filter((l) => {
        const logDateStr = new Date(l.scheduledAt).toISOString().split("T")[0];
        return logDateStr === dateStr;
      });

      last7Days.unshift({
        date: dateStr,
        taken: dayLogs.filter((l) => l.status === "taken").length,
        missed: dayLogs.filter((l) => l.status === "missed").length,
        skipped: dayLogs.filter((l) => l.status === "skipped").length,
      });
    }

    return res.json({
      success: true,
      adherencePercent,
      streakDays,
      totalDoses,
      takenDoses,
      missedDoses,
      last7Days,
    });
  } catch (error) {
    console.error("getPatientAdherence error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch patient adherence",
    });
  }
};

export const respondToAlert = async (req, res) => {
  try {
    const { response } = req.body || {};

    if (!["ok", "need_help"].includes(response)) {
      return res.status(400).json({
        success: false,
        message: "Response must be 'ok' or 'need_help'",
      });
    }

    const alert = await EscalationAlert.findById(req.params.alertId);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    const isPatient = String(alert.patientId) === String(req.user._id);
    const isCaregiver = String(alert.caregiverId) === String(req.user._id);

    if (!isPatient && !isCaregiver) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (response === "ok") {
      alert.status = isPatient ? "patient_ok" : "caregiver_ok";
    } else if (response === "need_help") {
      alert.status = "help_requested";
    }

    alert.respondedAt = new Date();
    alert.respondedBy = isPatient ? "patient" : "caregiver";
    await alert.save();

    if (alert.status === "help_requested") {
      const io = getIO();
      if (io) {
        emitToUser(String(alert.patientId), "alert:help_requested", {
          alertId: alert._id,
          medicineName: alert.medicineName,
        });
        if (alert.caregiverId) {
          emitToUser(String(alert.caregiverId), "alert:help_requested", {
            alertId: alert._id,
            medicineName: alert.medicineName,
          });
        }
      }
    }

    return res.json({ success: true, alert });
  } catch (error) {
    console.error("respondToAlert error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to respond to alert",
    });
  }
};

export const getPendingAlerts = async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const alerts = await EscalationAlert.find({
      $or: [{ patientId: req.user._id }, { caregiverId: req.user._id }],
      status: "pending",
      escalatedAt: { $gte: oneDayAgo },
    })
      .populate("reminderId", "medicineName")
      .sort({ escalatedAt: -1 });

    return res.json({
      success: true,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error("getPendingAlerts error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending alerts",
    });
  }
};
