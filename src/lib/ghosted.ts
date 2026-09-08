import type { ApplicationStatus } from "@/db/schema";

export const GHOST_THRESHOLD_DAYS = 10;
const GHOST_THRESHOLD_MS = GHOST_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

const TERMINAL_STATUSES = new Set<ApplicationStatus>([
  "REJECTED",
  "OFFER",
  "WITHDRAWN",
]);

export function isTerminalStatus(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

function lastActivityDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/** True when inactive longer than the Analyse threshold and not terminal. */
export function isStalePastGhostThreshold(application: {
  status: ApplicationStatus;
  lastActivityAt: Date | string;
}): boolean {
  if (isTerminalStatus(application.status)) return false;
  const lastActivity = lastActivityDate(application.lastActivityAt);
  if (Number.isNaN(lastActivity.getTime())) return false;
  return Date.now() - lastActivity.getTime() >= GHOST_THRESHOLD_MS;
}

export function isEligibleForGhost(application: {
  status: ApplicationStatus;
  lastActivityAt: Date | string;
  ghosted?: boolean | null;
}): boolean {
  if (application.ghosted) return false;
  return isStalePastGhostThreshold(application);
}

export function isGhosted(application: {
  status: ApplicationStatus;
  lastActivityAt: Date | string;
  ghosted?: boolean | null;
}): boolean {
  if (application.ghosted) return true;
  return isStalePastGhostThreshold(application);
}

export function isActiveStatus(status: ApplicationStatus): boolean {
  return status !== "REJECTED" && status !== "OFFER" && status !== "WITHDRAWN";
}
