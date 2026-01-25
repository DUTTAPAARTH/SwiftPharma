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
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "invalid"],
      default: "pending",
    },
    adminNotes: String,
  },
  { timestamps: true },
);

// Helper to recalculate expiry and flag
function computeExpiry(doc) {
  if (!doc.issueDate) doc.issueDate = new Date();
  if (!doc.expiryDate) {
    const expiry = new Date(doc.issueDate);
    expiry.setMonth(expiry.getMonth() + 6);
    doc.expiryDate = expiry;
  }
  doc.isExpired = doc.expiryDate < new Date();
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
