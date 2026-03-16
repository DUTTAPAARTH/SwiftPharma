import mongoose from "mongoose";
import { ORDER_STATUS } from "../utils/constants.js";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, default: 1 },
  price: { type: Number, required: true },
});

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    status: { type: String, enum: ORDER_STATUS, default: "Placed" },
    address: { type: String, required: true },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
    },
    payment: {
      method: { type: String, default: "upi" },
      transactionId: String,
      amount: Number,
    },
    deliveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryAgent",
    },
    statusHistory: {
      type: [statusEventSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Order", orderSchema);
