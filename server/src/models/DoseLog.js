import mongoose from "mongoose";

const doseLogNewSchema = new mongoose.Schema(
  {
    reminderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reminder",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    medicineName: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    takenAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["taken", "missed", "skipped"],
      required: true,
    },
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

doseLogNewSchema.index({ patientId: 1, scheduledAt: -1 });
doseLogNewSchema.index({ reminderId: 1, scheduledAt: 1 });

export default mongoose.model("DoseLog", doseLogNewSchema);
