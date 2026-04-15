import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  createReminder,
  getAdherenceStats,
  getMyReminders,
  getTodayReminders,
  logDose,
  updateReminder,
  deleteReminder,
} from "../services/reminderService";

const TABS = [
  { key: "today", label: "Today" },
  { key: "medicines", label: "My Medicines" },
  { key: "progress", label: "Progress" },
];

const COLOR_OPTIONS = [
  { name: "Cyan", value: "#00bcd4" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Green", value: "#22c55e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
];

const DAY_OPTIONS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const frequencyOptions = [
  { value: "daily", label: "Daily (once)" },
  { value: "twice_daily", label: "Twice daily" },
  { value: "three_times", label: "Three times daily" },
  { value: "weekly", label: "Weekly" },
  { value: "custom", label: "Custom" },
];

const createDefaultForm = () => ({
  medicineName: "",
  dosage: "",
  notes: "",
  color: "#00bcd4",
  frequency: "daily",
  times: ["08:00"],
  daysOfWeek: [],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  noEndDate: true,
  withFood: false,
  currentStock: 0,
  refillReminderAt: 5,
  isCritical: false,
  escalationWindowMinutes: 30,
});

const normalizeStatus = (value) =>
  String(value || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const formatDateLabel = (value = new Date()) =>
  new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const formatTimeLabel = (value) => {
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

const parseTimeToMinutes = (value) => {
  const [hours, minutes] = String(value || "00:00")
    .split(":")
    .map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const getProgressTone = (value) => {
  if (value >= 80) return { stroke: "#00bcd4", text: "text-cyan-300" };
  if (value >= 50) return { stroke: "#f59e0b", text: "text-amber-300" };
  return { stroke: "#ef4444", text: "text-red-300" };
};

const getStockTone = (stock, threshold) => {
  if (stock <= 0) {
    return {
      badge: "border-red-500/30 bg-red-500/10 text-red-200",
      label: "Reorder now",
    };
  }
  if (stock <= threshold) {
    return {
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-200",
      label: "Low stock",
    };
  }
  return {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    label: "In stock",
  };
};

const buildScheduleGroups = (schedule = []) => {
  const buckets = {
    Morning: [],
    Afternoon: [],
    Evening: [],
  };

  for (const entry of schedule) {
    const minutes = parseTimeToMinutes(entry.time);
    if (minutes < 12 * 60) buckets.Morning.push(entry);
    else if (minutes < 17 * 60) buckets.Afternoon.push(entry);
    else buckets.Evening.push(entry);
  }

  return buckets;
};

const toFormState = (reminder) => ({
  medicineName: reminder?.medicineName || "",
  dosage: reminder?.dosage || "",
  notes: reminder?.notes || "",
  color: reminder?.color || "#00bcd4",
  frequency: reminder?.frequency || "daily",
  times:
    Array.isArray(reminder?.times) && reminder.times.length
      ? reminder.times
      : ["08:00"],
  daysOfWeek: Array.isArray(reminder?.daysOfWeek) ? reminder.daysOfWeek : [],
  startDate: reminder?.startDate
    ? new Date(reminder.startDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10),
  endDate: reminder?.endDate
    ? new Date(reminder.endDate).toISOString().slice(0, 10)
    : "",
  noEndDate: !reminder?.endDate,
  withFood: Boolean(reminder?.withFood),
  currentStock: Number(reminder?.currentStock || 0),
  refillReminderAt: Number(reminder?.refillReminderAt || 5),
  isCritical: Boolean(reminder?.isCritical),
  escalationWindowMinutes: Number(reminder?.escalationWindowMinutes || 30),
});

const buildPayload = (form) => ({
  medicineName: form.medicineName.trim(),
  dosage: form.dosage.trim(),
  notes: form.notes.trim(),
  color: form.color,
  frequency: form.frequency,
  times: form.times.filter(Boolean),
  daysOfWeek:
    form.frequency === "weekly" || form.frequency === "custom"
      ? form.daysOfWeek
      : [],
  startDate: form.startDate,
  endDate: form.noEndDate ? null : form.endDate || null,
  withFood: form.withFood,
  isCritical: Boolean(form.isCritical),
  escalationWindowMinutes: Math.max(
    5,
    Math.min(180, Number(form.escalationWindowMinutes || 30)),
  ),
  currentStock: Math.max(0, Number(form.currentStock || 0)),
  refillReminderAt: Math.max(0, Number(form.refillReminderAt || 0)),
});

const updateScheduleEntry = (schedule, target, nextStatus) =>
  schedule.map((entry) => {
    if (
      String(entry.reminderId) === String(target.reminderId) &&
      String(entry.time) === String(target.time)
    ) {
      return { ...entry, status: nextStatus };
    }
    return entry;
  });

const LoadingSkeleton = ({ rows = 3 }) => (
  <div className="space-y-3 rounded-3xl border border-[#15324a] bg-[#0d1424] p-5">
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="h-20 animate-pulse rounded-2xl bg-[#111a2f]"
      />
    ))}
  </div>
);

const Toast = ({ toast, onClose }) => {
  if (!toast) return null;
  const tone =
    toast.type === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : "border-cyan-500/30 bg-cyan-500/10 text-cyan-50";

  return (
    <div className="fixed right-5 top-24 z-[80] max-w-sm">
      <div className={`rounded-2xl border px-4 py-3 shadow-xl ${tone}`}>
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-semibold leading-relaxed">
            {toast.message}
          </p>
          <button
            onClick={onClose}
            className="text-xs uppercase tracking-widest text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const AdherenceRing = ({ value, taken, total }) => {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const tone = getProgressTone(clamped);

  return (
    <div className="relative flex size-44 items-center justify-center">
      <svg viewBox="0 0 140 140" className="size-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="#18253e"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke={tone.stroke}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className={`text-3xl font-black ${tone.text}`}>
          {Math.round(clamped)}%
        </p>
        <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
          {taken}/{total} doses taken
        </p>
      </div>
    </div>
  );
};

const ReminderModal = ({
  open,
  form,
  onChange,
  onClose,
  onSubmit,
  saving,
  editing,
}) => {
  if (!open) return null;

  const showDaySelector =
    form.frequency === "weekly" || form.frequency === "custom";

  const updateTime = (index, value) => {
    const times = [...form.times];
    times[index] = value;
    onChange("times", times);
  };

  const setFrequency = (value) => {
    let times = ["08:00"];
    if (value === "twice_daily") times = ["08:00", "20:00"];
    if (value === "three_times") times = ["08:00", "14:00", "20:00"];
    if (value === "weekly") times = [form.times?.[0] || "08:00"];
    if (value === "custom") times = form.times?.length ? form.times : ["08:00"];
    onChange("frequency", value);
    onChange("times", times);
    if (value !== "weekly" && value !== "custom") onChange("daysOfWeek", []);
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-black/70 px-4 py-10"
      onClick={onClose}
    >
      <div
        className="mx-auto max-w-3xl rounded-[32px] border border-[#164667] bg-[#0a0f1e] p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              {editing ? "Edit Medicine" : "Add Reminder"}
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">
              {editing ? "Update reminder" : "Create medicine reminder"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-[#1c3850] px-3 py-2 text-sm text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#13324a] bg-[#0d1424] p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Medicine Info
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-200">
                  Medicine name
                </span>
                <input
                  value={form.medicineName}
                  onChange={(event) =>
                    onChange("medicineName", event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                  placeholder="Paracetamol"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-200">
                  Dosage
                </span>
                <input
                  value={form.dosage}
                  onChange={(event) => onChange("dosage", event.target.value)}
                  className="w-full rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                  placeholder="500mg"
                />
              </label>
              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-200">
                  Color
                </span>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange("color", option.value)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${form.color === option.value ? "border-white text-white" : "border-[#24455f] text-slate-300"}`}
                    >
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: option.value }}
                      />
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-200">
                  Notes
                </span>
                <textarea
                  value={form.notes}
                  onChange={(event) => onChange("notes", event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                  placeholder="Optional notes about when or why you take it"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-[#13324a] bg-[#0d1424] p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Schedule
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-200">
                  Frequency
                </span>
                <select
                  value={form.frequency}
                  onChange={(event) => setFrequency(event.target.value)}
                  className="w-full rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-3 md:col-span-2">
                <span className="text-sm font-semibold text-slate-200">
                  Times
                </span>
                {form.times.map((time, index) => (
                  <div
                    key={`${index}-${form.frequency}`}
                    className="flex items-center gap-3"
                  >
                    <input
                      type="time"
                      value={time}
                      onChange={(event) =>
                        updateTime(index, event.target.value)
                      }
                      className="w-full rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                    />
                    {form.frequency === "custom" && form.times.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          onChange(
                            "times",
                            form.times.filter(
                              (_, currentIndex) => currentIndex !== index,
                            ),
                          )
                        }
                        className="rounded-2xl border border-red-500/30 px-3 py-3 text-xs font-bold text-red-200"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
                {form.frequency === "custom" ? (
                  <button
                    type="button"
                    onClick={() => onChange("times", [...form.times, "12:00"])}
                    className="rounded-2xl border border-cyan-400/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-200"
                  >
                    Add time
                  </button>
                ) : null}
              </div>

              {showDaySelector ? (
                <div className="space-y-3 md:col-span-2">
                  <span className="text-sm font-semibold text-slate-200">
                    Days of week
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((day) => {
                      const active = form.daysOfWeek.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? form.daysOfWeek.filter((value) => value !== day)
                              : [...form.daysOfWeek, day];
                            onChange("daysOfWeek", next);
                          }}
                          className={`rounded-full border px-3 py-2 text-xs font-bold capitalize ${active ? "border-cyan-400 bg-cyan-500/15 text-cyan-100" : "border-[#24455f] text-slate-300"}`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <label className="flex items-center justify-between rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 md:col-span-2">
                <span className="text-sm font-semibold text-slate-200">
                  Take with food
                </span>
                <input
                  type="checkbox"
                  checked={form.withFood}
                  onChange={(event) =>
                    onChange("withFood", event.target.checked)
                  }
                  className="size-5 accent-cyan-500"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-[#13324a] bg-[#0d1424] p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Duration
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-200">
                  Start date
                  <label className="flex items-center justify-between rounded-2xl border border-red-900/30 bg-red-500/10 px-4 py-3 md:col-span-2">
                    <span className="text-sm font-semibold text-red-200">
                      🔴 Critical dose alert
                    </span>
                    <input
                      type="checkbox"
                      checked={form.isCritical || false}
                      onChange={(event) =>
                        onChange("isCritical", event.target.checked)
                      }
                      className="size-5 accent-red-500"
                    />
                  </label>
                  {form.isCritical && (
                    <>
                      <label className="space-y-2 md:col-span-2">
                        <span className="text-sm font-semibold text-slate-200">
                          Escalation window (minutes)
                        </span>
                        <select
                          value={form.escalationWindowMinutes || 30}
                          onChange={(event) =>
                            onChange(
                              "escalationWindowMinutes",
                              Number(event.target.value),
                            )
                          }
                          className="w-full rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                        >
                          <option value={15}>15 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={60}>60 minutes</option>
                        </select>
                      </label>
                    </>
                  )}
                </span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    onChange("startDate", event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-200">
                  End date
                </span>
                <input
                  type="date"
                  value={form.endDate}
                  disabled={form.noEndDate}
                  onChange={(event) => onChange("endDate", event.target.value)}
                  className="w-full rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 text-white outline-none focus:border-cyan-400 disabled:opacity-50"
                />
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 md:col-span-2">
                <span className="text-sm font-semibold text-slate-200">
                  No end date
                </span>
                <input
                  type="checkbox"
                  checked={form.noEndDate}
                  onChange={(event) =>
                    onChange("noEndDate", event.target.checked)
                  }
                  className="size-5 accent-cyan-500"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-[#13324a] bg-[#0d1424] p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Stock Tracking
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-200">
                  Current stock count
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.currentStock}
                  onChange={(event) =>
                    onChange("currentStock", event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-200">
                  Refill reminder threshold
                </span>
                <input
                  type="number"
                  min="0"
                  value={form.refillReminderAt}
                  onChange={(event) =>
                    onChange("refillReminderAt", event.target.value)
                  }
                  className="w-full rounded-2xl border border-[#1b3952] bg-[#08111d] px-4 py-3 text-white outline-none focus:border-cyan-400"
                />
              </label>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 md:col-span-2">
                Remind me to refill when I have {form.refillReminderAt || 0}{" "}
                days left.
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-2xl border border-[#22455e] px-5 py-3 text-sm font-black uppercase tracking-widest text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-[#02151a] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteModal = ({ reminder, onClose, onConfirm, loading }) => {
  if (!reminder) return null;
  return (
    <div
      className="fixed inset-0 z-[75] bg-black/70 px-4 py-10"
      onClick={onClose}
    >
      <div
        className="mx-auto max-w-md rounded-[32px] border border-red-500/20 bg-[#0a0f1e] p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
          Delete Reminder
        </p>
        <h3 className="mt-3 text-2xl font-black text-white">
          Stop reminders for {reminder.medicineName}?
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Your dose history will be kept.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-2xl border border-[#24455f] px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-black uppercase tracking-widest text-white disabled:opacity-60"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

const MedicineReminders = () => {
  const [activeTab, setActiveTab] = useState("today");
  const [reminders, setReminders] = useState([]);
  const [todayData, setTodayData] = useState({ date: "", schedule: [] });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState({
    today: true,
    medicines: true,
    progress: true,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [form, setForm] = useState(createDefaultForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.clearTimeout(window.__swiftpharmaReminderToast);
    window.__swiftpharmaReminderToast = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const loadReminders = async () => {
    setLoading((current) => ({ ...current, medicines: true }));
    try {
      const { data } = await getMyReminders();
      setReminders(Array.isArray(data?.reminders) ? data.reminders : []);
    } finally {
      setLoading((current) => ({ ...current, medicines: false }));
    }
  };

  const loadToday = async () => {
    setLoading((current) => ({ ...current, today: true }));
    try {
      const { data } = await getTodayReminders();
      setTodayData({
        date: data?.date || new Date().toISOString().slice(0, 10),
        schedule: Array.isArray(data?.schedule) ? data.schedule : [],
      });
    } finally {
      setLoading((current) => ({ ...current, today: false }));
    }
  };

  const loadStats = async () => {
    setLoading((current) => ({ ...current, progress: true }));
    try {
      const { data } = await getAdherenceStats();
      setStats(data?.stats || null);
    } finally {
      setLoading((current) => ({ ...current, progress: false }));
    }
  };

  useEffect(() => {
    loadReminders();
    loadToday();
    loadStats();
  }, []);

  const groupedSchedule = useMemo(
    () => buildScheduleGroups(todayData.schedule),
    [todayData.schedule],
  );

  const todayTakenCount = useMemo(
    () =>
      todayData.schedule.filter(
        (entry) => normalizeStatus(entry.status) === "taken",
      ).length,
    [todayData.schedule],
  );

  const todayCompletion = todayData.schedule.length
    ? (todayTakenCount / todayData.schedule.length) * 100
    : 0;

  const allTaken =
    todayData.schedule.length > 0 &&
    todayTakenCount === todayData.schedule.length;

  const progressMessage = useMemo(() => {
    const rate = Number(stats?.adherenceRate || 0);
    if (rate >= 90) {
      return "Excellent! You're taking your medicines consistently. Keep it up!";
    }
    if (rate >= 70) {
      return "Good progress! Try not to miss doses for better health outcomes.";
    }
    return "You've missed some doses recently. Consider setting an alarm to help remember.";
  }, [stats]);

  const sortedMedicineStats = useMemo(() => {
    const entries = Array.isArray(stats?.perMedicine)
      ? [...stats.perMedicine]
      : [];
    return entries.sort((a, b) => a.adherenceRate - b.adherenceRate);
  }, [stats]);

  const openCreate = () => {
    setEditingReminder(null);
    setForm(createDefaultForm());
    setModalOpen(true);
  };

  const openEdit = (reminder) => {
    setEditingReminder(reminder);
    setForm(toFormState(reminder));
    setModalOpen(true);
  };

  const handleFormChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveReminder = async () => {
    if (!form.medicineName.trim()) {
      showToast("Medicine name is required", "error");
      return;
    }
    if (!form.times.filter(Boolean).length) {
      showToast("At least one time is required", "error");
      return;
    }
    if (
      (form.frequency === "weekly" || form.frequency === "custom") &&
      !form.daysOfWeek.length
    ) {
      showToast("Select at least one day of week", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (editingReminder?._id) {
        await updateReminder(editingReminder._id, payload);
        showToast("Reminder updated");
      } else {
        await createReminder(payload);
        showToast("Reminder created");
      }
      setModalOpen(false);
      setEditingReminder(null);
      await Promise.all([loadReminders(), loadToday(), loadStats()]);
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Unable to save reminder",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    setDeleting(true);
    try {
      await deleteReminder(deleteTarget._id);
      showToast("Reminder deleted");
      setDeleteTarget(null);
      await Promise.all([loadReminders(), loadToday(), loadStats()]);
    } catch (error) {
      showToast(
        error?.response?.data?.message || "Unable to delete reminder",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  const toggleReminder = async (reminder) => {
    const previous = [...reminders];
    if (reminder.isActive) {
      setReminders((current) =>
        current.filter((entry) => entry._id !== reminder._id),
      );
    }
    try {
      await updateReminder(reminder._id, { isActive: !reminder.isActive });
      showToast(!reminder.isActive ? "Reminder activated" : "Reminder paused");
      await Promise.all([loadReminders(), loadToday(), loadStats()]);
    } catch (error) {
      setReminders(previous);
      showToast(
        error?.response?.data?.message || "Unable to update reminder",
        "error",
      );
    }
  };

  const handleDoseAction = async (entry, nextStatus) => {
    if (normalizeStatus(entry.status) === "taken") return;

    const previousToday = { ...todayData, schedule: [...todayData.schedule] };
    const previousReminders = [...reminders];

    setTodayData((current) => ({
      ...current,
      schedule: updateScheduleEntry(current.schedule, entry, nextStatus),
    }));

    if (nextStatus === "taken") {
      setReminders((current) =>
        current.map((reminder) => {
          if (String(reminder._id) !== String(entry.reminderId))
            return reminder;
          return {
            ...reminder,
            currentStock: Math.max(0, Number(reminder.currentStock || 0) - 1),
          };
        }),
      );
    }

    try {
      const response = await logDose(entry.reminderId, {
        date: todayData.date || new Date().toISOString().slice(0, 10),
        time: entry.time,
        status: nextStatus,
      });
      if (response?.data?.lowStock) {
        showToast(
          `${entry.medicineName} is running low (${response.data.currentStock} left)`,
          "error",
        );
      }
      void loadStats();
      void loadReminders();
    } catch (error) {
      setTodayData(previousToday);
      setReminders(previousReminders);
      showToast(
        error?.response?.data?.message || "Unable to log dose",
        "error",
      );
    }
  };

  const renderTodayTab = () => {
    if (loading.today) return <LoadingSkeleton rows={4} />;

    if (!todayData.schedule.length) {
      return (
        <div className="rounded-[32px] border border-[#15324a] bg-[#0d1424] p-10 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-[28px] bg-cyan-500/15 text-cyan-300">
            <span className="material-symbols-outlined text-5xl">pill</span>
          </div>
          <h3 className="mt-6 text-3xl font-black text-white">
            No medicines scheduled for today
          </h3>
          <p className="mt-3 text-slate-400">
            Set up your first medicine reminder.
          </p>
          <button
            onClick={openCreate}
            className="mt-6 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-[#04141b]"
          >
            Add Reminder
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="grid gap-6 rounded-[32px] border border-[#15324a] bg-[#0d1424] p-6 lg:grid-cols-[220px_1fr] lg:items-center">
          <div className="flex justify-center">
            <AdherenceRing
              value={todayCompletion}
              taken={todayTakenCount}
              total={todayData.schedule.length}
            />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-300">
              Today, {formatDateLabel(todayData.date || new Date())}
            </p>
            <h2 className="mt-3 text-4xl font-black text-white">
              Stay on track
            </h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Mark each dose as you take it. Your adherence and streak update
              automatically.
            </p>
            {allTaken ? (
              <div className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <span className="material-symbols-outlined text-3xl">
                      task_alt
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-black text-emerald-100">
                      All doses taken today!
                    </p>
                    <p className="text-sm text-emerald-200/80">
                      Great job keeping up with your medicines.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {Object.entries(groupedSchedule).map(([label, entries]) => (
          <div key={label} className="space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-lg font-black text-white">{label}</p>
              <div className="h-px flex-1 bg-[#17334c]" />
            </div>
            {entries.length ? (
              <div className="space-y-4">
                {entries.map((entry) => {
                  const status = normalizeStatus(entry.status);
                  const locked = status === "taken";
                  const cardTone =
                    status === "taken"
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : status === "skipped"
                        ? "border-slate-600/40 bg-slate-700/20 opacity-70"
                        : status === "snoozed"
                          ? "border-amber-500/30 bg-amber-500/10"
                          : "border-[#15324a] bg-[#0d1424]";

                  return (
                    <div
                      key={`${entry.reminderId}-${entry.time}`}
                      className={`overflow-hidden rounded-[28px] border ${cardTone} transition-all duration-300`}
                    >
                      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <div
                            className="mt-1 h-16 w-1 rounded-full"
                            style={{
                              backgroundColor: entry.color || "#00bcd4",
                            }}
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="text-xl font-black text-white">
                                {entry.medicineName}
                              </p>
                              <span className="rounded-full border border-[#254c68] px-3 py-1 text-xs font-bold text-slate-300">
                                {entry.dosage || "Dose not set"}
                              </span>
                              {entry.withFood ? (
                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200">
                                  With food
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                              <span>{formatTimeLabel(entry.time)}</span>
                              <span className="capitalize">{status}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <button
                            disabled={locked}
                            onClick={() => handleDoseAction(entry, "taken")}
                            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-xs font-black uppercase tracking-widest text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Taken
                          </button>
                          <button
                            disabled={locked}
                            onClick={() => handleDoseAction(entry, "skipped")}
                            className="rounded-2xl border border-slate-500/30 bg-slate-500/15 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Skip
                          </button>
                          <button
                            disabled={locked}
                            onClick={() => handleDoseAction(entry, "snoozed")}
                            className="rounded-2xl border border-amber-500/30 bg-amber-500/15 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Snooze
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-[#15324a] bg-[#0d1424] p-5 text-sm text-slate-500">
                No doses in this time block.
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMedicineTab = () => {
    if (loading.medicines) return <LoadingSkeleton rows={4} />;

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              Active Reminders
            </p>
            <h2 className="mt-2 text-4xl font-black text-white">
              My Medicines
            </h2>
          </div>
          <button
            onClick={openCreate}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-[#02151a]"
          >
            Add New Reminder
          </button>
        </div>

        {!reminders.length ? (
          <div className="rounded-[32px] border border-[#15324a] bg-[#0d1424] p-10 text-center text-slate-400">
            <p className="text-2xl font-black text-white">
              No medicine reminders yet
            </p>
            <p className="mt-3">
              Create your first reminder to start tracking doses.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {reminders.map((reminder) => {
              const stockTone = getStockTone(
                reminder.currentStock,
                reminder.refillReminderAt,
              );
              return (
                <div
                  key={reminder._id}
                  className="overflow-hidden rounded-[30px] border border-[#15324a] bg-[#0d1424]"
                >
                  <div className="flex h-full">
                    <div
                      className="w-2 shrink-0"
                      style={{ backgroundColor: reminder.color || "#00bcd4" }}
                    />
                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-2xl font-black text-white">
                            {reminder.medicineName}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {reminder.dosage || "No dosage set"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(reminder)}
                            className="rounded-2xl border border-[#22455e] px-3 py-2 text-xs font-black uppercase tracking-widest text-cyan-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(reminder)}
                            className="rounded-2xl border border-red-500/30 px-3 py-2 text-xs font-black uppercase tracking-widest text-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-widest">
                        <span className="rounded-full border border-[#254c68] px-3 py-1 text-slate-300">
                          {formatFrequencyLabel(reminder.frequency)}
                        </span>
                        <span className="rounded-full border border-[#254c68] px-3 py-1 text-slate-300">
                          {(reminder.times || [])
                            .map(formatTimeLabel)
                            .join(", ")}
                        </span>
                        {reminder.withFood ? (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-200">
                            With food
                          </span>
                        ) : null}
                        {reminder.isCritical ? (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-200 flex items-center gap-1">
                            🔴 Critical
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${stockTone.badge}`}
                          >
                            {stockTone.label}
                          </span>
                          <p className="text-sm text-slate-400">
                            Stock:{" "}
                            <span className="font-semibold text-white">
                              {reminder.currentStock || 0}
                            </span>{" "}
                            · Refill at {reminder.refillReminderAt || 0}
                          </p>
                        </div>

                        <label className="flex items-center gap-3 rounded-full border border-[#22455e] px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300">
                          <span>
                            {reminder.isActive ? "Active" : "Inactive"}
                          </span>
                          <input
                            type="checkbox"
                            checked={Boolean(reminder.isActive)}
                            onChange={() => toggleReminder(reminder)}
                            className="size-5 accent-cyan-500"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderProgressTab = () => {
    if (loading.progress) return <LoadingSkeleton rows={5} />;

    if (!stats || !stats.totalDoses) {
      return (
        <div className="rounded-[32px] border border-[#15324a] bg-[#0d1424] p-10 text-center text-slate-400">
          <p className="text-2xl font-black text-white">
            No adherence history yet
          </p>
          <p className="mt-3">
            Log doses for a few days to unlock progress insights.
          </p>
        </div>
      );
    }

    const overallTone = getProgressTone(stats.adherenceRate || 0);

    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[28px] border border-[#15324a] bg-[#0d1424] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Overall adherence
            </p>
            <p className={`mt-4 text-5xl font-black ${overallTone.text}`}>
              {Math.round(stats.adherenceRate || 0)}%
            </p>
            <p className="mt-2 text-sm text-slate-400">Last 30 days</p>
          </div>
          <div className="rounded-[28px] border border-[#15324a] bg-[#0d1424] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Current streak
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative flex size-12 items-center justify-center rounded-full bg-amber-500/10">
                <div className="absolute size-6 rounded-full bg-gradient-to-t from-amber-500 to-orange-300 blur-[1px]" />
                <div className="absolute bottom-1 size-3 rounded-full bg-[#0d1424]" />
              </div>
              <div>
                <p className="text-4xl font-black text-white">
                  {stats.currentStreak || 0}
                </p>
                <p className="text-sm text-slate-400">days in a row</p>
              </div>
            </div>
          </div>
          <div className="rounded-[28px] border border-[#15324a] bg-[#0d1424] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Doses taken this month
            </p>
            <p className="mt-4 text-4xl font-black text-white">
              {stats.currentMonth?.takenDoses || 0}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              out of {stats.currentMonth?.scheduledDoses || 0} scheduled
            </p>
          </div>
          <div className="rounded-[28px] border border-[#15324a] bg-[#0d1424] p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Medicines tracked
            </p>
            <p className="mt-4 text-4xl font-black text-white">
              {stats.activeReminders || 0}
            </p>
            <p className="mt-2 text-sm text-slate-400">active reminders</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-[#15324a] bg-[#0d1424] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                  30-day adherence
                </p>
                <h3 className="mt-2 text-3xl font-black text-white">
                  Calendar view
                </h3>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-5 gap-3 md:grid-cols-6 xl:grid-cols-10">
              {(stats.dailyAdherence || []).map((day) => {
                const tone =
                  day.performance === "complete"
                    ? "bg-emerald-500"
                    : day.performance === "partial"
                      ? "bg-amber-500"
                      : day.performance === "missed"
                        ? "bg-red-500"
                        : "bg-slate-700";
                return (
                  <div
                    key={day.date}
                    title={`${new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${day.taken}/${day.scheduled} doses taken`}
                    className={`group relative aspect-square rounded-xl ${tone}`}
                  >
                    <div className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#284b64] bg-[#08111d] px-2 py-1 text-[11px] text-slate-200 shadow-lg group-hover:block">
                      {new Date(day.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {` — ${day.taken}/${day.scheduled} doses taken`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] border border-[#15324a] bg-[#0d1424] p-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              Focus message
            </p>
            <h3 className="mt-2 text-3xl font-black text-white">
              How you are doing
            </h3>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              {progressMessage}
            </p>
            <div className="mt-6 rounded-3xl border border-[#1b3952] bg-[#08111d] p-5">
              <p className="text-sm font-semibold text-slate-300">
                Best streak ever
              </p>
              <p className="mt-2 text-4xl font-black text-white">
                {stats.bestStreak || 0}
              </p>
              <p className="text-sm text-slate-500">
                consecutive fully completed days
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-[#15324a] bg-[#0d1424] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
                Per medicine breakdown
              </p>
              <h3 className="mt-2 text-3xl font-black text-white">
                Where support is needed most
              </h3>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {sortedMedicineStats.map((entry) => (
              <div
                key={entry.reminderId}
                className="rounded-[26px] border border-[#1b3952] bg-[#08111d] p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-14 w-1 rounded-full"
                      style={{ backgroundColor: entry.color || "#00bcd4" }}
                    />
                    <div>
                      <p className="text-xl font-black text-white">
                        {entry.medicineName}
                      </p>
                      <p className="text-sm text-slate-400">
                        {entry.takenDoses} doses taken, {entry.skippedDoses}{" "}
                        skipped
                      </p>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white">
                    {Math.round(entry.adherenceRate || 0)}%
                  </p>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#162236]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, entry.adherenceRate || 0))}%`,
                      backgroundColor: entry.color || "#00bcd4",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] font-nexus-bold text-slate-100">
      <Navbar />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-32">
        <div className="rounded-[40px] border border-[#17334c] bg-gradient-to-br from-[#0d1424] to-[#091019] p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-300">
                Dose Tracker
              </p>
              <h1 className="mt-3 text-5xl font-black tracking-tight text-white">
                Medicine Reminders
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-400">
                Schedule daily medicines, log doses instantly, and monitor
                adherence over time.
              </p>
            </div>
            <div className="rounded-[28px] border border-[#1d425d] bg-[#08111d] px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Today
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {formatDateLabel(todayData.date || new Date())}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 rounded-[28px] border border-[#18344d] bg-[#08111d] p-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-[20px] px-5 py-3 text-sm font-black uppercase tracking-[0.18em] transition-all ${activeTab === tab.key ? "bg-cyan-500 text-[#02151a]" : "text-slate-400 hover:bg-[#0f1a2e] hover:text-white"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {activeTab === "today" ? renderTodayTab() : null}
          {activeTab === "medicines" ? renderMedicineTab() : null}
          {activeTab === "progress" ? renderProgressTab() : null}
        </div>
      </main>

      <ReminderModal
        open={modalOpen}
        form={form}
        onChange={handleFormChange}
        onClose={() => {
          setModalOpen(false);
          setEditingReminder(null);
        }}
        onSubmit={saveReminder}
        saving={saving}
        editing={Boolean(editingReminder)}
      />
      <DeleteModal
        reminder={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
      />
      <Footer />
    </div>
  );
};

export default MedicineReminders;
