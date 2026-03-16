import mongoose from "mongoose";
import { ROLES } from "../utils/constants.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
    passwordHash: { type: String, required: true },
    medicalHistory: { type: String },
    suspended: { type: Boolean, default: false },
    rememberMeEnabled: { type: Boolean, default: false },
    lastLoginEmail: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
