import mongoose from "mongoose";

const doctorProfileSchema = new mongoose.Schema(
  {
    doctorName: { type: String, trim: true, default: "" },
    doctorNameNormalized: { type: String, trim: true, default: "", index: true },
    registrationNumber: {
      type: String,
      trim: true,
      default: undefined,
      sparse: true,
    },
    handwritingPatternHash: { type: String, trim: true, default: "" },
    trustScore: { type: Number, min: 0, max: 100, default: 50, index: true },
    matchCount: { type: Number, default: 0, min: 0 },
    mismatchCount: { type: Number, default: 0, min: 0 },
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

doctorProfileSchema.index({ registrationNumber: 1 }, { unique: true, sparse: true });
doctorProfileSchema.index({ doctorNameNormalized: 1, lastSeenAt: -1 });

export default mongoose.model("DoctorProfile", doctorProfileSchema);
