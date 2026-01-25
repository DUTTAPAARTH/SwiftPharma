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
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
