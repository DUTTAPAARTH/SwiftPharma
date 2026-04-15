import mongoose from "mongoose";

const VaultItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    default: null,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    default: "units",
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  criticalLevel: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  notes: {
    type: String,
    default: "",
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  lastRefillRemindedAt: {
    type: Date,
    default: null,
  },
});

VaultItemSchema.index({ userId: 1, productName: 1 });

export default mongoose.model("VaultItem", VaultItemSchema);
