import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "bot"], required: true },
    text: { type: String, required: true },
    confidenceLevel: { type: String },
    sources: { type: Array, default: [] },
    provider: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  messages: [chatMessageSchema],
  updatedAt: { type: Date, default: Date.now },
});

chatHistorySchema.pre("save", function updateTimestampsAndTrim(next) {
  this.updatedAt = new Date();
  if (Array.isArray(this.messages) && this.messages.length > 100) {
    this.messages = this.messages.slice(-100);
  }
  next();
});

chatHistorySchema.pre("findOneAndUpdate", function updateTimestamp(next) {
  this.set({ updatedAt: new Date() });
  next();
});

const ChatHistory = mongoose.model("ChatHistory", chatHistorySchema);

export default ChatHistory;

