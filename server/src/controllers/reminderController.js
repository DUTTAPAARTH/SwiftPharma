import Reminder from "../models/Reminder.js";

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const ALLOWED_COLORS = new Set([
  "#00bcd4",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
]);

const toObjectIdString = (value) => String(value || "");

const toLocalDateKey = (value = new Date()) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fromDateKey = (value) => {
  const [year, month, day] = String(value || "")
    .split("-")
    .map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const addDays = (value, amount) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};

const getDayName = (value) => DAY_NAMES[new Date(value).getDay()];

const parseTimeToMinutes = (value) => {
  const [hours, minutes] = String(value || "00:00")
    .split(":")
    .map((part) => Number(part || 0));
  return hours * 60 + minutes;
};

const formatTime = (value) => {
  if (!value) return "";
  const [hours, minutes] = String(value).split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatFrequencyLabel = (value) => {
  const map = {
    daily: "Daily",
    twice_daily: "Twice Daily",
    three_times: "Three Times",
    weekly: "Weekly",
    custom: "Custom",
  };
  return map[value] || value;
};

const normalizeDaysOfWeek = (days) => {
  if (!Array.isArray(days)) return [];
  return [
    ...new Set(
      days.map((day) =>
        String(day || "")
          .trim()
          .toLowerCase(),
      ),
    ),
  ].filter((day) => DAY_NAMES.includes(day));
};

const normalizeTimes = (times, frequency = "daily") => {
  const filtered = Array.isArray(times)
    ? [
        ...new Set(
          times.map((time) => String(time || "").trim()).filter(Boolean),
        ),
      ]
    : [];

  if (filtered.length) {
    return filtered.sort(
      (a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b),
    );
  }

  if (frequency === "twice_daily") return ["08:00", "20:00"];
  if (frequency === "three_times") return ["08:00", "14:00", "20:00"];
  return ["08:00"];
};

const normalizeColor = (value) => {
  const color = String(value || "#00bcd4")
    .trim()
    .toLowerCase();
  return ALLOWED_COLORS.has(color) ? color : "#00bcd4";
};

const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const normalizeReminderInput = (body = {}, { partial = false } = {}) => {
  const payload = {};

  if (!partial || body.medicineName !== undefined) {
    const medicineName = String(body.medicineName || "").trim();
    if (!partial && !medicineName) {
      throw new Error("Medicine name is required");
    }
    if (medicineName) payload.medicineName = medicineName;
  }

  if (body.dosage !== undefined)
    payload.dosage = String(body.dosage || "").trim();
  if (body.notes !== undefined) payload.notes = String(body.notes || "").trim();
  if (body.frequency !== undefined)
    payload.frequency = String(body.frequency || "daily");
  if (body.color !== undefined) payload.color = normalizeColor(body.color);
  if (body.withFood !== undefined) payload.withFood = Boolean(body.withFood);
  if (body.isCritical !== undefined) {
    payload.isCritical = Boolean(body.isCritical);
  }
  if (body.escalationWindowMinutes !== undefined) {
    const windowMinutes = Math.floor(
      clampNumber(body.escalationWindowMinutes, 30),
    );
    payload.escalationWindowMinutes = Math.max(5, Math.min(180, windowMinutes));
  }
  if (body.caregiverId !== undefined) {
    payload.caregiverId = body.caregiverId || null;
  }
  if (body.currentStock !== undefined) {
    payload.currentStock = Math.max(
      0,
      Math.floor(clampNumber(body.currentStock, 0)),
    );
  }
  if (body.refillReminderAt !== undefined) {
    payload.refillReminderAt = Math.max(
      0,
      Math.floor(clampNumber(body.refillReminderAt, 5)),
    );
  }
  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);
  if (body.daysOfWeek !== undefined)
    payload.daysOfWeek = normalizeDaysOfWeek(body.daysOfWeek);

  const frequency = payload.frequency || body.frequency || "daily";
  if (body.times !== undefined || !partial) {
    payload.times = normalizeTimes(body.times, frequency);
  }

  if (body.startDate !== undefined || !partial) {
    payload.startDate = body.startDate ? new Date(body.startDate) : new Date();
  }
  if (body.endDate !== undefined) {
    payload.endDate = body.endDate ? new Date(body.endDate) : undefined;
  }

  if (
    payload.endDate &&
    payload.startDate &&
    payload.endDate < payload.startDate
  ) {
    throw new Error("End date cannot be before start date");
  }

  return payload;
};

const getReminderWindowEnd = (reminder, today = new Date()) => {
  const candidates = [];
  if (reminder.endDate) candidates.push(endOfDay(reminder.endDate));
  if (!reminder.isActive)
    candidates.push(endOfDay(reminder.updatedAt || today));
  if (!candidates.length) return endOfDay(today);
  return new Date(Math.min(...candidates.map((value) => value.getTime())));
};

const isReminderDueOnDate = (reminder, dateLike) => {
  const date = startOfDay(dateLike);
  const start = startOfDay(
    reminder.startDate || reminder.createdAt || new Date(),
  );
  const end = reminder.endDate ? endOfDay(reminder.endDate) : null;

  if (date < start) return false;
  if (end && date > end) return false;
  if (!reminder.isActive && date > endOfDay(reminder.updatedAt || start))
    return false;

  const frequency = reminder.frequency || "daily";
  const dayName = getDayName(date);

  if (["daily", "twice_daily", "three_times"].includes(frequency)) {
    return true;
  }

  if (frequency === "weekly") {
    const scheduledDays = normalizeDaysOfWeek(reminder.daysOfWeek);
    if (scheduledDays.length) return scheduledDays.includes(dayName);
    return getDayName(start) === dayName;
  }

  if (frequency === "custom") {
    const scheduledDays = normalizeDaysOfWeek(reminder.daysOfWeek);
    if (!scheduledDays.length) return true;
    return scheduledDays.includes(dayName);
  }

  return true;
};

const getLogIndex = (doseLog = [], date, time) =>
  doseLog.findIndex(
    (entry) =>
      entry.date === date && String(entry.time || "") === String(time || ""),
  );

const getDoseStatus = (reminder, date, time) => {
  const doseLog = Array.isArray(reminder.doseLog) ? reminder.doseLog : [];
  const entries = doseLog
    .filter(
      (entry) =>
        entry.date === date && String(entry.time || "") === String(time || ""),
    )
    .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));

  if (!entries.length) return "pending";
  const latest = entries[0].status;
  if (latest === "taken" || latest === "skipped") return latest;
  return "pending";
};

const buildScheduleForDate = (reminders, dateLike) => {
  const dateKey = toLocalDateKey(dateLike);
  const schedule = [];

  for (const reminder of reminders) {
    if (!isReminderDueOnDate(reminder, dateLike)) continue;
    const times = normalizeTimes(reminder.times, reminder.frequency);

    for (const time of times) {
      schedule.push({
        reminderId: reminder._id,
        medicineName: reminder.medicineName,
        dosage: reminder.dosage || "",
        time,
        status: getDoseStatus(reminder, dateKey, time),
        withFood: Boolean(reminder.withFood),
        color: reminder.color || "#00bcd4",
      });
    }
  }

  return schedule.sort(
    (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time),
  );
};

const computeStats = (reminders) => {
  const today = startOfDay(new Date());
  const last30Start = addDays(today, -29);
  const scheduleByDay = new Map();
  const medicineStats = new Map();

  const ensureDay = (dateKey) => {
    if (!scheduleByDay.has(dateKey)) {
      scheduleByDay.set(dateKey, {
        date: dateKey,
        scheduled: 0,
        taken: 0,
        skipped: 0,
      });
    }
    return scheduleByDay.get(dateKey);
  };

  const ensureMedicine = (reminder) => {
    const key = toObjectIdString(reminder._id);
    if (!medicineStats.has(key)) {
      medicineStats.set(key, {
        reminderId: reminder._id,
        medicineName: reminder.medicineName,
        dosage: reminder.dosage || "",
        color: reminder.color || "#00bcd4",
        scheduledDoses: 0,
        takenDoses: 0,
        skippedDoses: 0,
        adherenceRate: 0,
      });
    }
    return medicineStats.get(key);
  };

  let totalDoses = 0;
  let takenDoses = 0;
  let skippedDoses = 0;
  let monthScheduled = 0;
  let monthTaken = 0;

  const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  for (const reminder of reminders) {
    const reminderStats = ensureMedicine(reminder);
    const statsWindowEnd = getReminderWindowEnd(reminder, today);
    const statStart = startOfDay(
      reminder.startDate || reminder.createdAt || today,
    );
    const statEnd = statsWindowEnd > today ? today : statsWindowEnd;

    for (
      let cursor = new Date(statStart);
      cursor <= statEnd;
      cursor = addDays(cursor, 1)
    ) {
      if (!isReminderDueOnDate(reminder, cursor)) continue;
      const times = normalizeTimes(reminder.times, reminder.frequency);
      const dateKey = toLocalDateKey(cursor);
      const dayBucket = ensureDay(dateKey);

      for (const time of times) {
        const status = getDoseStatus(reminder, dateKey, time);

        if (cursor >= last30Start) {
          dayBucket.scheduled += 1;
          reminderStats.scheduledDoses += 1;
          totalDoses += 1;

          if (status === "taken") {
            dayBucket.taken += 1;
            reminderStats.takenDoses += 1;
            takenDoses += 1;
          }
          if (status === "skipped") {
            dayBucket.skipped += 1;
            reminderStats.skippedDoses += 1;
            skippedDoses += 1;
          }
        }

        if (cursor >= startOfThisMonth) {
          monthScheduled += 1;
          if (status === "taken") monthTaken += 1;
        }
      }
    }
  }

  for (const entry of medicineStats.values()) {
    entry.adherenceRate = entry.scheduledDoses
      ? Number(((entry.takenDoses / entry.scheduledDoses) * 100).toFixed(1))
      : 0;
  }

  const getDayPerformance = (dateKey) => {
    const bucket = scheduleByDay.get(dateKey);
    if (!bucket || bucket.scheduled === 0) return "none";
    if (bucket.taken === bucket.scheduled) return "complete";
    if (bucket.taken > 0) return "partial";
    return "missed";
  };

  let currentStreak = 0;
  for (
    let cursor = new Date(today);
    cursor >= last30Start;
    cursor = addDays(cursor, -1)
  ) {
    const performance = getDayPerformance(toLocalDateKey(cursor));
    if (performance === "none") continue;
    if (performance === "complete") {
      currentStreak += 1;
      continue;
    }
    break;
  }

  const earliestStart = reminders.length
    ? reminders.reduce((lowest, reminder) => {
        const candidate = startOfDay(
          reminder.startDate || reminder.createdAt || today,
        );
        return candidate < lowest ? candidate : lowest;
      }, today)
    : today;

  let bestStreak = 0;
  let rollingStreak = 0;
  for (
    let cursor = new Date(earliestStart);
    cursor <= today;
    cursor = addDays(cursor, 1)
  ) {
    const performance = getDayPerformance(toLocalDateKey(cursor));
    if (performance === "none") continue;
    if (performance === "complete") {
      rollingStreak += 1;
      if (rollingStreak > bestStreak) bestStreak = rollingStreak;
    } else {
      rollingStreak = 0;
    }
  }

  const dailyAdherence = [];
  for (
    let cursor = new Date(last30Start);
    cursor <= today;
    cursor = addDays(cursor, 1)
  ) {
    const dateKey = toLocalDateKey(cursor);
    const bucket = scheduleByDay.get(dateKey) || {
      date: dateKey,
      scheduled: 0,
      taken: 0,
      skipped: 0,
    };
    dailyAdherence.push({
      ...bucket,
      performance: getDayPerformance(dateKey),
    });
  }

  return {
    totalDoses,
    takenDoses,
    skippedDoses,
    adherenceRate: totalDoses
      ? Number(((takenDoses / totalDoses) * 100).toFixed(1))
      : 0,
    currentStreak,
    bestStreak,
    currentMonth: {
      takenDoses: monthTaken,
      scheduledDoses: monthScheduled,
    },
    activeReminders: reminders.filter((reminder) => reminder.isActive).length,
    perMedicine: Array.from(medicineStats.values()),
    dailyAdherence,
  };
};

export const createReminder = async (req, res) => {
  try {
    const payload = normalizeReminderInput(req.body);
    const reminder = await Reminder.create({
      ...payload,
      userId: req.user._id,
    });

    return res.status(201).json({ success: true, reminder });
  } catch (error) {
    console.error("createReminder error", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create reminder",
    });
  }
};

export const getMyReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({
      userId: req.user._id,
      isActive: true,
    }).sort({ medicineName: 1, createdAt: -1 });

    return res.json({ success: true, reminders });
  } catch (error) {
    console.error("getMyReminders error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load reminders",
    });
  }
};

export const getTodayReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({
      userId: req.user._id,
      isActive: true,
    }).sort({ medicineName: 1 });

    const today = new Date();
    const schedule = buildScheduleForDate(reminders, today);

    return res.json({
      success: true,
      date: toLocalDateKey(today),
      schedule,
    });
  } catch (error) {
    console.error("getTodayReminders error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to build today's schedule",
    });
  }
};

export const logDose = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!reminder) {
      return res
        .status(404)
        .json({ success: false, message: "Reminder not found" });
    }

    const date = String(req.body.date || toLocalDateKey(new Date())).trim();
    const time = String(req.body.time || "").trim();
    const status = String(req.body.status || "").trim();
    const note = String(req.body.note || "").trim();

    if (!date) {
      return res
        .status(400)
        .json({ success: false, message: "Date is required" });
    }

    if (!["taken", "skipped", "snoozed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be taken, skipped, or snoozed",
      });
    }

    const index = getLogIndex(reminder.doseLog, date, time);
    const existing = index >= 0 ? reminder.doseLog[index] : null;

    if (existing?.status === "taken") {
      return res.status(409).json({
        success: false,
        message: "Taken doses cannot be changed",
        currentStock: reminder.currentStock,
        lowStock: reminder.currentStock <= reminder.refillReminderAt,
      });
    }

    if (existing) {
      reminder.doseLog[index] = {
        ...existing,
        date,
        time,
        status,
        note,
        loggedAt: new Date(),
      };
    } else {
      reminder.doseLog.push({
        date,
        time,
        status,
        note,
        loggedAt: new Date(),
      });
    }

    if (status === "taken" && reminder.currentStock > 0) {
      reminder.currentStock = Math.max(0, reminder.currentStock - 1);
    }

    await reminder.save();

    const lowStock = reminder.currentStock <= reminder.refillReminderAt;
    return res.json({
      success: true,
      lowStock,
      currentStock: reminder.currentStock,
    });
  } catch (error) {
    console.error("logDose error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to log dose" });
  }
};

export const updateReminder = async (req, res) => {
  try {
    if (req.body?.doseLog !== undefined) {
      return res.status(400).json({
        success: false,
        message: "Dose log cannot be updated through this endpoint",
      });
    }

    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!reminder) {
      return res
        .status(404)
        .json({ success: false, message: "Reminder not found" });
    }

    const payload = normalizeReminderInput(req.body, { partial: true });
    Object.assign(reminder, payload);
    reminder.times = normalizeTimes(reminder.times, reminder.frequency);
    reminder.daysOfWeek = normalizeDaysOfWeek(reminder.daysOfWeek);
    reminder.currentStock = Math.max(
      0,
      Math.floor(clampNumber(reminder.currentStock, 0)),
    );
    reminder.refillReminderAt = Math.max(
      0,
      Math.floor(clampNumber(reminder.refillReminderAt, 5)),
    );

    await reminder.save();
    return res.json({ success: true, reminder });
  } catch (error) {
    console.error("updateReminder error", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update reminder",
    });
  }
};

export const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!reminder) {
      return res
        .status(404)
        .json({ success: false, message: "Reminder not found" });
    }

    reminder.isActive = false;
    await reminder.save();
    return res.json({ success: true });
  } catch (error) {
    console.error("deleteReminder error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete reminder" });
  }
};

export const getAdherenceStats = async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.user._id }).sort({
      createdAt: 1,
    });
    const stats = computeStats(reminders);

    return res.json({ success: true, stats });
  } catch (error) {
    console.error("getAdherenceStats error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate adherence stats",
    });
  }
};

export const reminderControllerUtils = {
  toLocalDateKey,
  fromDateKey,
  formatTime,
  formatFrequencyLabel,
  normalizeTimes,
  normalizeDaysOfWeek,
  buildScheduleForDate,
  computeStats,
};
