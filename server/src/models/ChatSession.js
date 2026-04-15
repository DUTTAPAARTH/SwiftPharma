import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["system", "user", "assistant"],
      required: true,
    },
    content: { type: String, required: true, trim: true },
    contextSnapshot: { type: String, trim: true, default: "" },
    mentions: [{ type: String, trim: true }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, trim: true, default: "New Health Chat" },
    isActive: { type: Boolean, default: true, index: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    summary: { type: String, trim: true, default: "" },
    summaryGeneratedAt: { type: Date, default: null },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true },
);

chatSessionSchema.index({ userId: 1, isActive: 1, createdAt: -1 });

export default mongoose.model("ChatSession", chatSessionSchema);
