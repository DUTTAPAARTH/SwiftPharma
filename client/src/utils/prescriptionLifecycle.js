const REVIEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const PENDING_REVIEW_STATUSES = [
  "pending",
  "ai_reviewing",
  "awaiting_pharmacist",
];

const toDate = (value, fallback = null) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value;
  }

  if (!value) return fallback;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const getRestoredPendingStatus = (prescription) => {
  if (prescription?.aiValidated || prescription?.aiConfidenceScore != null) {
    return "awaiting_pharmacist";
  }

  return "pending";
};

export const getPrescriptionDisplayState = (prescription, now = new Date()) => {
  const createdAt = toDate(prescription?.createdAt, now);
  const expiryDate = toDate(prescription?.expiryDate);
  const reviewExpiresAt = new Date(createdAt.getTime() + REVIEW_WINDOW_MS);
  const approvedAt = toDate(prescription?.approvedAt);
  const rejectedAt = toDate(prescription?.rejectedAt);

  let status = String(prescription?.status || "pending");

  if (
    status === "expired" &&
    !approvedAt &&
    !rejectedAt &&
    now < reviewExpiresAt
  ) {
    status = getRestoredPendingStatus(prescription);
  }

  if (PENDING_REVIEW_STATUSES.includes(status) && now >= reviewExpiresAt) {
    status = "expired";
  }

  if (status === "approved" && expiryDate && expiryDate < now) {
    status = "expired";
  }

  return {
    status,
    isExpired: status === "expired",
    expiryDate,
    reviewExpiresAt,
    isPendingReview: PENDING_REVIEW_STATUSES.includes(status),
  };
};
