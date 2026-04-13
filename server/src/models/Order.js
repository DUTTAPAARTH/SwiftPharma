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

const trackingStatusEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    description: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    updatedAt: { type: Date, default: Date.now },
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
    autoRefill: { type: Boolean, default: false },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
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
    tracking: {
      deliveryAgentName: { type: String, trim: true },
      currentLocation: locationSchema,
      destinationLocation: {
        lat: { type: Number },
        lng: { type: Number },
      },
      estimatedDeliveryTime: { type: Date },
      statusHistory: {
        type: [trackingStatusEventSchema],
        default: [],
      },
    },
    statusHistory: {
      type: [statusEventSchema],
      default: [],
    },
  },
  { timestamps: true },
);

export default mongoose.model("Order", orderSchema);
