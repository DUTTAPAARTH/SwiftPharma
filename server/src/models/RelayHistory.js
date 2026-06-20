import mongoose from "mongoose";

const relayHistorySchema = new mongoose.Schema(
  {
    relayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmergencyRelay",
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    medicines: [
      {
        name: { type: String, required: true },
        quantity: { type: String, default: "1" },
      },
    ],
    requestedAt: { type: Date, required: true },
    claimedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    claimDurationMinutes: { type: Number, default: null },
    totalDurationMinutes: { type: Number, default: 0 },
    outcome: {
      type: String,
      enum: ["delivered", "cancelled", "expired"],
      required: true,
    },
    agentName: { type: String, default: null },
    escalationLevel: { type: Number, default: 0 },
    reorderedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("RelayHistory", relayHistorySchema);

