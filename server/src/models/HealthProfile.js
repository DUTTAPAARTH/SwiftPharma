import mongoose from "mongoose";

const memoryMentionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ["chat", "vault", "prescription", "manual"],
      default: "chat",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },
    confidence: { type: Number, min: 0, max: 1, default: 0.6 },
    relatedSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
      default: null,
    },
    seenCount: { type: Number, min: 1, default: 1 },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const healthProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    age: { type: Number, min: 0, max: 120, default: null },
    biologicalSex: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say", ""],
      default: "",
    },
    bloodGroup: { type: String, trim: true, default: "" },
    heightCm: { type: Number, min: 0, default: null },
    weightKg: { type: Number, min: 0, default: null },
    allergies: [{ type: String, trim: true }],
    chronicConditions: [{ type: String, trim: true }],
    regularMedicines: [{ type: String, trim: true }],
    lifestyleNotes: { type: String, trim: true, default: "" },
    healthGoals: [{ type: String, trim: true }],
    preferredLanguage: { type: String, trim: true, default: "English" },
    preferredTone: {
      type: String,
      enum: ["supportive", "concise", "detailed"],
      default: "supportive",
    },
    memoryMentions: {
      type: [memoryMentionSchema],
      default: [],
    },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("HealthProfile", healthProfileSchema);

