import type { ApplicationStatus } from "@/db/schema";

const GHOST_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

const TERMINAL_STATUSES = new Set<ApplicationStatus>([
  "REJECTED",
  "OFFER",
  "WITHDRAWN",
]);

export function isGhosted(application: {
  status: ApplicationStatus;
  lastActivityAt: Date | string;
}): boolean {
  if (TERMINAL_STATUSES.has(application.status)) {
    return false;
  }

  const lastActivity =
    application.lastActivityAt instanceof Date
      ? application.lastActivityAt
      : new Date(application.lastActivityAt);

  if (Number.isNaN(lastActivity.getTime())) {
    return false;
  }

  return Date.now() - lastActivity.getTime() >= GHOST_THRESHOLD_MS;
}

export function isActiveStatus(status: ApplicationStatus): boolean {
  return status !== "REJECTED" && status !== "OFFER" && status !== "WITHDRAWN";
}
