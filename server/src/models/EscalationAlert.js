import mongoose from "mongoose";

const escalationAlertSchema = new mongoose.Schema(
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
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    medicineName: { type: String, required: true },
    scheduledAt: { type: Date, required: true },
    escalatedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: [
        "pending",
        "patient_ok",
        "caregiver_ok",
        "help_requested",
        "expired",
      ],
      default: "pending",
      index: true,
    },
    respondedAt: { type: Date, default: null },
    respondedBy: {
      type: String,
      enum: ["patient", "caregiver"],
      default: null,
    },
    notificationSentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

escalationAlertSchema.index({ patientId: 1, status: 1 });
escalationAlertSchema.index({ caregiverId: 1, status: 1 });
escalationAlertSchema.index({ reminderId: 1, scheduledAt: 1 });

export default mongoose.model("EscalationAlert", escalationAlertSchema);

