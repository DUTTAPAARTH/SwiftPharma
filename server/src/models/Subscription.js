import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    product: {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      name: String,
      price: Number,
      quantity: { type: Number, default: 1 },
      isRx: { type: Boolean, default: false },
    },
    frequency: {
      type: String,
      enum: ["weekly", "biweekly", "monthly", "bimonthly"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled", "expired"],
      default: "active",
    },
    startDate: { type: Date, default: Date.now },
    nextRefillDate: { type: Date, required: true },
    lastRefillDate: { type: Date },
    lastOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    totalRefills: { type: Number, default: 0 },
    reminderDaysBefore: { type: Number, default: 2 },
    reminderLastSentAt: { type: Date },
    notes: String,
    cancelledAt: Date,
    cancelReason: String,
  },
  { timestamps: true },
);

subscriptionSchema.methods.calculateNextRefillDate = function () {
  const now = new Date();
  switch (this.frequency) {
    case "weekly":
      return new Date(now.setDate(now.getDate() + 7));
    case "biweekly":
      return new Date(now.setDate(now.getDate() + 14));
    case "monthly":
      return new Date(now.setMonth(now.getMonth() + 1));
    case "bimonthly":
      return new Date(now.setMonth(now.getMonth() + 2));
    default:
      return new Date(now.setMonth(now.getMonth() + 1));
  }
};

export default mongoose.model("Subscription", subscriptionSchema);

