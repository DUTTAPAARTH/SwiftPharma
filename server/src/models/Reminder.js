import mongoose from "mongoose";

const doseLogSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    time: { type: String },
    status: {
      type: String,
      enum: ["taken", "skipped", "snoozed"],
      required: true,
    },
    loggedAt: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false },
);

const reminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    medicineName: { type: String, required: true },
    dosage: { type: String },
    times: [{ type: String }],
    frequency: {
      type: String,
      enum: ["daily", "twice_daily", "three_times", "weekly", "custom"],
      default: "daily",
    },
    daysOfWeek: [{ type: String }],
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
    color: { type: String, default: "#00bcd4" },
    withFood: { type: Boolean, default: false },
    refillReminderAt: { type: Number, default: 5 },
    currentStock: { type: Number, default: 0 },
    doseLog: [doseLogSchema],
  },
  { timestamps: true },
);

export default mongoose.model("Reminder", reminderSchema);
