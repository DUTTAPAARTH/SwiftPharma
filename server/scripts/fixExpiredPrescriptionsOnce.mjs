import "dotenv/config";
import connectDB from "../src/config/db.js";
import Prescription from "../src/models/Prescription.js";
import {
  getRestoredPendingStatus,
  PRESCRIPTION_REVIEW_WINDOW_MS,
} from "../src/utils/prescriptionLifecycle.js";

await connectDB();

const reviewCutoff = new Date(Date.now() - PRESCRIPTION_REVIEW_WINDOW_MS);

const targets = await Prescription.find({
  status: "expired",
  createdAt: { $gte: reviewCutoff },
  approvedAt: null,
  rejectedAt: null,
}).select("_id aiValidated aiConfidenceScore createdAt status");

if (!targets.length) {
  console.log("FIX_EXPIRED_RESULT=0");
  process.exit(0);
}

const operations = targets.map((rx) => ({
  updateOne: {
    filter: { _id: rx._id },
    update: {
      $set: {
        status: getRestoredPendingStatus(rx),
        isExpired: false,
      },
    },
  },
}));

const result = await Prescription.bulkWrite(operations);

console.log(`FIX_EXPIRED_RESULT=${Number(result.modifiedCount || 0)}`);
console.log(`FIX_EXPIRED_TARGETS=${targets.length}`);
