import mongoose from "mongoose";

const emergencyCallLogSchema = new mongoose.Schema(
  {
    userId: {
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
    patientName: { type: String, default: "" },
    patientPhone: { type: String, default: "" },
    emergencyNumber: { type: String, default: "108" },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    locationLabel: { type: String, default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

emergencyCallLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("EmergencyCallLog", emergencyCallLogSchema);
