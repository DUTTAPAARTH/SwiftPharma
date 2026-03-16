import mongoose from "mongoose";

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

// Helper to recalculate expiry and expiration status
function computeExpiry(doc) {
  if (!doc.issueDate) {
    doc.issueDate = doc.createdAt || new Date();
  }

  // If expiry date is not explicitly set, default to six months from upload.
  if (!doc.expiryDate) {
    const baseDate = doc.createdAt || doc.issueDate || new Date();
    const expiry = new Date(baseDate);
    expiry.setMonth(expiry.getMonth() + 6);
    doc.expiryDate = expiry;
  }

  doc.isExpired = doc.expiryDate < new Date();

  if (doc.isExpired && doc.status !== "approved" && doc.status !== "rejected") {
    doc.status = "expired";
  }
}

prescriptionSchema.pre("save", function (next) {
  if (typeof next !== "function") {
    console.error(
      "[Prescription] pre-save: next is not a function",
      typeof next,
    );
    return;
  }
  try {
    computeExpiry(this);
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
    // Normalize nested $set updates
    const target = update.$set || update;
    if (target.issueDate || target.expiryDate) {
      const working = {
        issueDate: target.issueDate,
        expiryDate: target.expiryDate,
      };
      computeExpiry(working);
      target.issueDate = working.issueDate;
      target.expiryDate = working.expiryDate;
      target.isExpired = working.isExpired;
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model("Prescription", prescriptionSchema);
