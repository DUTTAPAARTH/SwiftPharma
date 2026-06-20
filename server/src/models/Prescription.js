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
    quantityPrescribed: { type: Number, min: 0, default: 0 },
    quantityDispensed: { type: Number, min: 0, default: 0 },
    quantityRemaining: { type: Number, min: 0, default: 0 },
    refillsAllowed: { type: Number, min: 0, default: 0 },
    refillsUsed: { type: Number, min: 0, default: 0 },
    scheduleType: {
      type: String,
      enum: ["OTC", "H", "H1", "X"],
      default: "OTC",
    },
  },
  { _id: false },
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const processingStageSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ["uploaded", "ocr", "ai", "pharmacist", "approved"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    completedAt: { type: Date, default: null },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const ALLOWED_STATUS_TRANSITIONS = {
  pending: ["ai_reviewing", "awaiting_pharmacist", "ai_rejected", "expired"],
  ai_reviewing: ["awaiting_pharmacist", "ai_rejected", "expired"],
  awaiting_pharmacist: ["approved", "rejected", "expired"],
  approved: ["partially_fulfilled", "fully_fulfilled", "expired", "rejected"],
  partially_fulfilled: ["fully_fulfilled", "expired", "rejected"],
  fully_fulfilled: ["expired"],
  ai_rejected: [],
  rejected: [],
  expired: [],
};

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
    imageHash: {
      type: String,
      trim: true,
      immutable: true,
      index: true,
      sparse: true,
    },
    prescriptionDNA: {
      type: String,
      trim: true,
      immutable: true,
      index: true,
      sparse: true,
    },
    isDuplicateImage: { type: Boolean, default: false, index: true },
    duplicateOfPrescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
      default: null,
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prescription",
      default: null,
    },
    doctorTrustScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
      index: true,
    },
    handwritingMismatch: { type: Boolean, default: false, index: true },
    doctorLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      address: { type: String, trim: true, default: "" },
    },
    patientLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      address: { type: String, trim: true, default: "" },
    },
    geoDistanceKm: { type: Number, default: null },
    geoFlag: { type: Boolean, default: false, index: true },
    processingStages: {
      type: [processingStageSchema],
      default: [],
    },
    estimatedCompletionTime: { type: Date, default: null },
    renewalRequested: { type: Boolean, default: false, index: true },
    renewalRequestedAt: { type: Date, default: null },
    renewalStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected", "fulfilled"],
      default: "none",
      index: true,
    },
    renewalReviewedAt: { type: Date, default: null },
    doctorVerified: { type: Boolean, default: false },
    retentionExpiresAt: { type: Date },
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
        "partially_fulfilled",
        "fully_fulfilled",
        "rejected",
        "expired",
      ],
      default: "pending",
    },
    cartReleaseStatus: {
      type: String,
      enum: ["blocked", "released"],
      default: "blocked",
      index: true,
    },
    sosOverride: {
      type: Boolean,
      default: false,
      validate: {
        validator(value) {
          return !value || Boolean(this.sosOrderId);
        },
        message: "sosOverride requires sosOrderId",
      },
    },
    sosOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    linkedOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    lastUsedAt: { type: Date, default: null },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
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
    const applyStatusAndHistory = (previousStatus) => {
      const lifecycle = getPrescriptionLifecycleState(
        {
          ...this.toObject(),
          createdAt: this.createdAt || now,
          expiryDate: this.expiryDate,
        },
        now,
      );

      const nextStatus = lifecycle.status;
      if (
        previousStatus &&
        previousStatus !== nextStatus &&
        !ALLOWED_STATUS_TRANSITIONS[previousStatus]?.includes(nextStatus)
      ) {
        throw new Error(
          `Illegal status transition: ${previousStatus} -> ${nextStatus}`,
        );
      }

      this.expiryDate = lifecycle.expiryDate;
      this.isExpired = lifecycle.isExpired;
      this.status = nextStatus;

      this.medicines = Array.isArray(this.medicines) ? this.medicines : [];
      this.medicines = this.medicines.map((medicine) => {
        const prescribed = Math.max(
          0,
          Number(medicine.quantityPrescribed || 0),
        );
        const dispensed = Math.max(0, Number(medicine.quantityDispensed || 0));
        const refillsAllowed = Math.max(
          0,
          Number(medicine.refillsAllowed || 0),
        );
        const refillsUsed = Math.max(0, Number(medicine.refillsUsed || 0));
        return {
          ...medicine,
          quantityPrescribed: prescribed,
          quantityDispensed: dispensed,
          refillsAllowed,
          refillsUsed,
          quantityRemaining: Math.max(0, prescribed - dispensed),
        };
      });

      if (this.sosOverride && !this.sosOrderId) {
        throw new Error("sosOverride requires sosOrderId");
      }

      if (!this.isNew && this.isModified("imageHash")) {
        throw new Error("imageHash is immutable and cannot be updated");
      }

      if (!this.isNew && this.isModified("prescriptionDNA")) {
        throw new Error("prescriptionDNA is immutable and cannot be updated");
      }

      if (this.isNew || (previousStatus && previousStatus !== this.status)) {
        const changedBy = this.$locals?.statusChangedBy || null;
        const note = String(this.$locals?.statusChangeNote || "").trim();
        this.statusHistory = Array.isArray(this.statusHistory)
          ? this.statusHistory
          : [];
        this.statusHistory.push({
          status: this.status,
          changedBy,
          changedAt: now,
          note,
        });
      }

      return next();
    };

    if (!this.expiryDate) {
      this.expiryDate = getDefaultPrescriptionExpiryDate(
        this.issueDate || this.createdAt || now,
      );
    }

    if (this.isNew) {
      return applyStatusAndHistory(null);
    }

    if (!this.isModified("status") && !this.isModified("expiryDate")) {
      return applyStatusAndHistory(this.status);
    }

    this.constructor
      .findById(this._id)
      .select("status")
      .lean()
      .then((existing) =>
        applyStatusAndHistory(existing?.status || this.status),
      )
      .catch(next);
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

prescriptionSchema.index({ userId: 1, status: 1 });
prescriptionSchema.index({ retentionExpiresAt: 1 });
prescriptionSchema.index({ userId: 1, renewalRequested: 1, renewalStatus: 1 });
prescriptionSchema.index({ geoFlag: 1, createdAt: -1 });

export default mongoose.model("Prescription", prescriptionSchema);

