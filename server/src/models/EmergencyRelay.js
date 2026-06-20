import crypto from "crypto";
import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: String, default: "1" },
  },
  { _id: false },
);

const emergencyRelaySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  medicines: {
    type: [medicineSchema],
    validate: {
      validator: (value) => Array.isArray(value) && value.length > 0,
      message: "At least one medicine is required",
    },
    required: true,
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  geoLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
    },
  },
  radiusKm: { type: Number, default: 5 },
  nearbyAgentCount: { type: Number, default: 0 },
  escalationLevel: { type: Number, default: 0 },
  escalationHistory: [
    {
      _id: false,
      level: { type: Number, required: true },
      radiusKm: { type: Number, required: true },
      escalatedAt: { type: Date, default: Date.now },
      newAgentCount: { type: Number, default: 0 },
    },
  ],
  lastEscalatedAt: { type: Date, default: null },
  notifiedAgentIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  adminNote: { type: String, default: "" },
  status: {
    type: String,
    enum: ["broadcasting", "claimed", "delivered", "cancelled"],
    default: "broadcasting",
    index: true,
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  claimedAt: { type: Date },
  resolvedAt: { type: Date },
  emergencyContactName: { type: String, default: "" },
  emergencyContactPhone: { type: String, default: "" },
  trackingToken: {
    type: String,
    unique: true,
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 2 * 60 * 60 * 1000),
    index: true,
  },
});

emergencyRelaySchema.pre("save", function ensureTrackingToken() {
  if (!this.trackingToken) {
    this.trackingToken = crypto.randomBytes(16).toString("hex");
  }
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  }

  const lat = Number(this.location?.lat);
  const lng = Number(this.location?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    this.geoLocation = {
      type: "Point",
      coordinates: [lng, lat],
    };
  }
});

emergencyRelaySchema.index({ geoLocation: "2dsphere" });

export default mongoose.model("EmergencyRelay", emergencyRelaySchema);

