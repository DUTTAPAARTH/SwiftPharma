import cron from "node-cron";
import DoseLog from "../models/DoseLog.js";
import EscalationAlert from "../models/EscalationAlert.js";
import Notification from "../models/Notification.js";
import Reminder from "../models/Reminder.js";
import User from "../models/User.js";
import { emitToUser, getIO } from "../socket.js";

let doseEscalationStarted = false;

const DAY_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getMostRecentScheduledTime = (reminder, now = new Date()) => {
  const times = reminder.times || [];
  if (!times.length) return null;

  const freq = String(reminder.frequency || "").toLowerCase();
  const daysOfWeek = reminder.daysOfWeek || [];
  const dayStr = DAY_OF_WEEK[now.getDay()];

  // Check if today is a scheduled day
  let isTodayScheduled = false;
  if (freq === "daily" || freq === "twice_daily" || freq === "three_times") {
    isTodayScheduled = true;
  } else if (freq === "weekly" && daysOfWeek.includes(dayStr)) {
    isTodayScheduled = true;
  } else if (freq === "custom" && daysOfWeek.includes(dayStr)) {
    isTodayScheduled = true;
  }

  if (!isTodayScheduled) {
    // Try yesterday (for daily/custom patterns)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = DAY_OF_WEEK[yesterday.getDay()];

    let isYesterdayScheduled = false;
    if (freq === "daily" || freq === "twice_daily" || freq === "three_times") {
      isYesterdayScheduled = true;
    } else if (freq === "weekly" && daysOfWeek.includes(yesterdayStr)) {
      isYesterdayScheduled = true;
    } else if (freq === "custom" && daysOfWeek.includes(yesterdayStr)) {
      isYesterdayScheduled = true;
    }

    if (!isYesterdayScheduled) return null;

    // Find most recent time from yesterday
    const reversedTimes = [...times].reverse();
    for (const timeStr of reversedTimes) {
      const [h, m] = String(timeStr || "")
        .split(":")
        .map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
      const scheduled = new Date(yesterday);
      scheduled.setHours(h, m, 0, 0);
      if (scheduled < now) {
        return scheduled;
      }
    }
    return null;
  }

  // Today is scheduled, find most recent time that has passed
  const reversedTimes = [...times].reverse();
  for (const timeStr of reversedTimes) {
    const [h, m] = String(timeStr || "")
      .split(":")
      .map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue;
    const scheduled = new Date(now);
    scheduled.setHours(h, m, 0, 0);
    if (scheduled < now) {
      return scheduled;
    }
  }

  return null;
};

const runEscalation = async () => {
  try {
    const now = new Date();

    // Find all critical reminders
    const criticalReminders = await Reminder.find({
      isCritical: true,
      isActive: true,
    }).select(
      "userId medicineName times frequency daysOfWeek escalationWindowMinutes caregiverId",
    );

    for (const reminder of criticalReminders) {
      const scheduledAt = getMostRecentScheduledTime(reminder, now);
      if (!scheduledAt) continue;

      const timeSinceScheduledMs = now.getTime() - scheduledAt.getTime();
      const timeSinceScheduledMinutes = timeSinceScheduledMs / 60000;
      const escalationWindow = Number(reminder.escalationWindowMinutes || 30);

      if (timeSinceScheduledMinutes < escalationWindow) continue;

      // Check if dose was logged as taken
      const doseLog = await DoseLog.findOne({
        reminderId: reminder._id,
        scheduledAt,
        status: "taken",
      });

      if (doseLog) continue; // Dose was taken, no alert needed

      // Check if alert already exists
      const existingAlert = await EscalationAlert.findOne({
        reminderId: reminder._id,
        scheduledAt,
      });

      if (existingAlert) continue; // Alert already created

      // Create escalation alert
      const alert = await EscalationAlert.create({
        reminderId: reminder._id,
        patientId: reminder.userId,
        caregiverId: reminder.caregiverId || null,
        medicineName: reminder.medicineName,
        scheduledAt,
        escalatedAt: now,
        notificationSentAt: now,
      });

      // Notify patient
      const patient = await User.findById(reminder.userId).select("name");
      await Notification.create({
        userId: reminder.userId,
        type: "dose_missed",
        message: `Critical dose missed: ${reminder.medicineName}. Tap to respond.`,
        data: { alertId: alert._id, reminderId: reminder._id },
      });

      // Notify caregiver if linked
      if (reminder.caregiverId) {
        const caregiver = await User.findById(reminder.caregiverId).select(
          "name",
        );
        const patientFirstName = String(patient?.name || "Patient").split(
          " ",
        )[0];
        await Notification.create({
          userId: reminder.caregiverId,
          type: "caregiver_dose_missed",
          message: `${patientFirstName} missed their ${reminder.medicineName} dose. Tap to check in.`,
          data: { alertId: alert._id, patientId: reminder.userId },
        });
      }

      // Socket emissions
      const io = getIO();
      if (io) {
        emitToUser(String(reminder.userId), "alert:dose_missed", {
          alertId: alert._id,
          medicineName: reminder.medicineName,
          scheduledAt,
        });

        if (reminder.caregiverId) {
          emitToUser(String(reminder.caregiverId), "alert:caregiver_notify", {
            alertId: alert._id,
            patientId: reminder.userId,
            medicineName: reminder.medicineName,
            scheduledAt,
          });
        }
      }
    }

    // Mark old pending alerts as expired
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await EscalationAlert.updateMany(
      { status: "pending", escalatedAt: { $lt: dayAgo } },
      { $set: { status: "expired" } },
    );
  } catch (error) {
    console.error("[doseEscalation] job failed", error);
  }
};

export const startDoseEscalationJob = () => {
  if (doseEscalationStarted) return;

  cron.schedule("*/5 * * * *", runEscalation);

  doseEscalationStarted = true;
  console.log("[doseEscalation] started (every 5 minutes)");
};
