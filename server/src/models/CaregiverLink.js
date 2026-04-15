import crypto from "crypto";
import mongoose from "mongoose";

const caregiverLinkSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    caregiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    caregiverPhone: { type: String, required: true, trim: true },
    caregiverName: { type: String, required: true, trim: true },
    inviteToken: {
      type: String,
      unique: true,
      index: true,
      sparse: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "revoked"],
      default: "pending",
      index: true,
    },
    createdAt: { type: Date, default: Date.now, index: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: false },
);

caregiverLinkSchema.index({ patientId: 1 });
caregiverLinkSchema.index({ caregiverId: 1 });

caregiverLinkSchema.pre("save", function ensureInviteToken(next) {
  if (!this.inviteToken && this.status === "pending") {
    this.inviteToken = crypto.randomBytes(16).toString("hex");
  }
  next();
});

export default mongoose.model("CaregiverLink", caregiverLinkSchema);
