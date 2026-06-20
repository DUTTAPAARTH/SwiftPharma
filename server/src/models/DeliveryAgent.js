import mongoose from "mongoose";

const deliveryAgentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("DeliveryAgent", deliveryAgentSchema);

