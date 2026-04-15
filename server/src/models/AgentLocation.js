import mongoose from "mongoose";

const AgentLocationSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
    index: true,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      default: [0, 0],
      required: true,
    },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

AgentLocationSchema.index({ location: "2dsphere" });

export default mongoose.model("AgentLocation", AgentLocationSchema);
