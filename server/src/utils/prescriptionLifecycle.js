const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
export const PRESCRIPTION_REVIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export const PENDING_REVIEW_STATUSES = [
  "pending",
  "ai_reviewing",
  "awaiting_pharmacist",
];

const toValidDate = (value, fallback = null) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value;
  }

  if (!value) return fallback;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export const getDefaultPrescriptionExpiryDate = (baseDate = new Date()) => {
  const anchor = toValidDate(baseDate, new Date());
  return new Date(anchor.getTime() + SIX_MONTHS_MS);
};

export const getPendingReviewExpiry = (createdAt = new Date()) => {
  const created = toValidDate(createdAt, new Date());
  return new Date(created.getTime() + PRESCRIPTION_REVIEW_WINDOW_MS);
};

export const getRestoredPendingStatus = (prescriptionLike = {}) => {
  if (
    prescriptionLike.aiValidated ||
    prescriptionLike.aiConfidenceScore != null
  ) {
    return "awaiting_pharmacist";
  }

  return "pending";
};

export const getPrescriptionLifecycleState = (
  prescriptionLike = {},
  now = new Date(),
) => {
  const createdAt = toValidDate(prescriptionLike.createdAt, now);
  const issueDate = toValidDate(prescriptionLike.issueDate, createdAt);
  const expiryDate = toValidDate(
    prescriptionLike.expiryDate,
    getDefaultPrescriptionExpiryDate(issueDate),
  );
  const approvedAt = toValidDate(prescriptionLike.approvedAt);
  const rejectedAt = toValidDate(prescriptionLike.rejectedAt);
  const reviewExpiresAt = getPendingReviewExpiry(createdAt);

  let status = String(prescriptionLike.status || "pending");

  const prematurelyExpired =
    status === "expired" && !approvedAt && !rejectedAt && now < reviewExpiresAt;

  if (prematurelyExpired) {
    status = getRestoredPendingStatus(prescriptionLike);
  }

  const reviewWindowExpired =
    PENDING_REVIEW_STATUSES.includes(status) && now >= reviewExpiresAt;
  const approvedExpired = status === "approved" && expiryDate < now;

  if (reviewWindowExpired || approvedExpired) {
    status = "expired";
  }

  return {
    status,
    isExpired: status === "expired",
    expiryDate,
    createdAt,
    issueDate,
    reviewExpiresAt,
    reviewWindowExpired,
    approvedExpired,
    prematurelyExpired,
  };
};
