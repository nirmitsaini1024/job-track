export const APPLICATION_STATUSES = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

export const REMOTE_TYPES = ["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"] as const;

export const SALARY_PERIODS = ["YEAR", "MONTH", "HOUR", "UNKNOWN"] as const;

export const EMAIL_CLASSIFICATIONS = [
  "REJECTED",
  "INTERVIEW",
  "SCREENING",
  "OFFER",
  "OTHER",
] as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_APPLICATION_ATTACHMENTS = 12;

export const STATUS_LABELS: Record<(typeof APPLICATION_STATUSES)[number], string> =
  {
    SAVED: "Saved",
    APPLIED: "Applied",
    SCREENING: "Screening",
    INTERVIEW: "Interview",
    OFFER: "Offer",
    REJECTED: "Rejected",
    WITHDRAWN: "Withdrawn",
  };

export const REMOTE_LABELS: Record<(typeof REMOTE_TYPES)[number], string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
  UNKNOWN: "Unknown",
};

export const CLASSIFICATION_TO_STATUS: Record<
  Exclude<(typeof EMAIL_CLASSIFICATIONS)[number], "OTHER">,
  (typeof APPLICATION_STATUSES)[number]
> = {
  REJECTED: "REJECTED",
  INTERVIEW: "INTERVIEW",
  SCREENING: "SCREENING",
  OFFER: "OFFER",
};

export const CLASSIFICATION_TO_EVENT: Record<
  Exclude<(typeof EMAIL_CLASSIFICATIONS)[number], "OTHER">,
  "REJECTION" | "INTERVIEW" | "EMAIL_RECEIVED" | "OFFER"
> = {
  REJECTED: "REJECTION",
  INTERVIEW: "INTERVIEW",
  SCREENING: "EMAIL_RECEIVED",
  OFFER: "OFFER",
};
