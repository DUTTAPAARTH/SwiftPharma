import mongoose from "mongoose";
import {
  getDefaultPrescriptionExpiryDate,
  getPrescriptionLifecycleState,
} from "../utils/prescriptionLifecycle.js";

const medicineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    dosage: String,
    frequency: String,
  },
  { _id: false },
);

const prescriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    images: [{ type: String, required: true }],
    ocrText: String,
    doctorName: String,
    doctorRegistration: String,
    issueDate: { type: Date, default: () => new Date() },
    expiryDate: { type: Date },
    isExpired: { type: Boolean, default: false },
    medicines: [medicineSchema],
    aiValidated: { type: Boolean, default: false },
    aiConfidenceScore: { type: Number, min: 0, max: 100 },
    aiExtractedMedicines: [
      {
        _id: false,
        name: String,
        dosage: String,
        quantity: String,
      },
    ],
    aiRejectionReason: { type: String },
    aiFlags: [{ type: String }],
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    pharmacistNotes: { type: String },
    verificationAttempts: { type: Number, default: 0 },
    lastVerificationAt: { type: Date },
    rejectedAt: { type: Date },
    approvedAt: { type: Date },
    status: {
      type: String,
      enum: [
        "pending",
        "ai_reviewing",
        "ai_rejected",
        "awaiting_pharmacist",
        "approved",
        "rejected",
        "expired",
      ],
      default: "pending",
    },
    adminNotes: String,
  },
  { timestamps: true },
);

prescriptionSchema.pre("save", function (next) {
  if (typeof next !== "function") {
    console.error(
      "[Prescription] pre-save: next is not a function",
      typeof next,
    );
    return;
  }
  try {
    const now = new Date();

    if (!this.expiryDate) {
      this.expiryDate = getDefaultPrescriptionExpiryDate(
        this.issueDate || this.createdAt || now,
      );
    }

    const lifecycle = getPrescriptionLifecycleState(
      {
        ...this.toObject(),
        createdAt: this.createdAt || now,
        expiryDate: this.expiryDate,
      },
      now,
    );

    this.expiryDate = lifecycle.expiryDate;
    this.isExpired = lifecycle.isExpired;
    this.status = lifecycle.status;

    next();
  } catch (error) {
    next(error);
  }
});

prescriptionSchema.pre("findOneAndUpdate", function (next) {
  if (typeof next !== "function") {
    console.error(
      "[Prescription] pre-findOneAndUpdate: next is not a function",
      typeof next,
    );
    return;
  }
  try {
    const update = this.getUpdate();
    if (!update) return next();
    const target = update.$set || update;
    const now = new Date();

    this.model
      .findOne(this.getQuery())
      .lean()
      .then((current) => {
        const merged = {
          ...(current || {}),
          ...update,
          ...target,
          createdAt: target.createdAt || current?.createdAt || now,
        };

        if (!merged.expiryDate) {
          merged.expiryDate = getDefaultPrescriptionExpiryDate(
            merged.issueDate || merged.createdAt || now,
          );
        }

        const lifecycle = getPrescriptionLifecycleState(merged, now);
        target.expiryDate = lifecycle.expiryDate;
        target.isExpired = lifecycle.isExpired;
        target.status = lifecycle.status;

        next();
      })
      .catch(next);
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("Prescription", prescriptionSchema);
