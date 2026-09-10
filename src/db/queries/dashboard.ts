import { isActiveStatus, isGhosted } from "@/lib/ghosted";
import { format } from "date-fns";
import type { ApplicationFilters } from "@/lib/validations/application";
import {
  getApplicationsForAnalytics,
  type SerializedApplication,
} from "@/db/queries/applications";
import type {
  Application,
  ApplicationEvent,
  Communication,
  ApplicationStatus,
} from "@/db/schema";

const MEANINGFUL_CLASSIFICATIONS = new Set([
  "REJECTED",
  "INTERVIEW",
  "SCREENING",
  "OFFER",
]);

const RESPONSE_EVENTS = new Set([
  "EMAIL_RECEIVED",
  "INTERVIEW",
  "OFFER",
  "REJECTION",
]);

function hasMeaningfulResponse(
  app: Application,
  events: ApplicationEvent[],
  comms: Communication[],
): boolean {
  if (["SCREENING", "INTERVIEW", "OFFER", "REJECTED"].includes(app.status)) {
    return true;
  }
  if (events.some((event) => RESPONSE_EVENTS.has(event.type))) {
    return true;
  }
  return comms.some(
    (item) =>
      item.aiClassification &&
      MEANINGFUL_CLASSIFICATIONS.has(item.aiClassification),
  );
}

const PIPELINE_ORDER: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
];

function statusRank(status: ApplicationStatus | string | undefined): number {
  if (!status) return -1;
  return PIPELINE_ORDER.indexOf(status as ApplicationStatus);
}

/** Highest pipeline stage implied by a single event. */
function eventStatusRank(event: ApplicationEvent): number {
  if (event.type === "INTERVIEW") return statusRank("INTERVIEW");
  if (event.type === "OFFER") return statusRank("OFFER");
  if (event.type === "STATUS_CHANGED") {
    const to =
      event.metadata && typeof event.metadata === "object"
        ? (event.metadata as { to?: string }).to
        : undefined;
    return statusRank(to);
  }
  return -1;
}

/**
 * Pipeline stage for funnel/rates.
 * Active apps use current status only so mistaken status clicks
 * (then corrected back) do not inflate Screening/Interview/Offer.
 * Rejected/withdrawn apps keep their peak stage from history so
 * real interviews that ended in rejection still count.
 */
function pipelineRank(app: Application, events: ApplicationEvent[]): number {
  const current = statusRank(app.status);
  if (app.status !== "REJECTED" && app.status !== "WITHDRAWN") {
    return current;
  }
  let max = current;
  for (const event of events) {
    max = Math.max(max, eventStatusRank(event));
  }
  return max;
}

function reachedStage(
  app: Application,
  events: ApplicationEvent[],
  status: ApplicationStatus,
): boolean {
  return pipelineRank(app, events) >= statusRank(status);
}

export type DashboardStats = {
  total: number;
  active: number;
  rejected: number;
  ghosted: number;
  screenings: number;
  interviews: number;
  offers: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
};

export type ApplicationAnalytics = DashboardStats & {
  volume: { date: string; count: number }[];
  funnel: { stage: string; count: number }[];
  outcomes: { name: string; value: number }[];
  byPosition: {
    position: string;
    applied: number;
    responses: number;
    responseRate: number;
    interviews: number;
  }[];
};

export async function getDashboardStats(
  filters: ApplicationFilters = {},
  ownerId?: string,
): Promise<DashboardStats> {
  const analytics = await getApplicationAnalytics(filters, ownerId);
  return {
    total: analytics.total,
    active: analytics.active,
    rejected: analytics.rejected,
    ghosted: analytics.ghosted,
    screenings: analytics.screenings,
    interviews: analytics.interviews,
    offers: analytics.offers,
    responseRate: analytics.responseRate,
    interviewRate: analytics.interviewRate,
    offerRate: analytics.offerRate,
  };
}

export async function getApplicationAnalytics(
  filters: ApplicationFilters = {},
  ownerId?: string,
): Promise<ApplicationAnalytics> {
  const { applications, events, communications } =
    await getApplicationsForAnalytics(filters, ownerId);

  const eventsByApp = groupBy(events, (e) => e.applicationId);
  const commsByApp = groupBy(communications, (c) => c.applicationId);

  const total = applications.length;
  const active = applications.filter((app) => isActiveStatus(app.status)).length;
  const rejected = applications.filter((app) => app.status === "REJECTED").length;
  const ghosted = applications.filter((app) => isGhosted(app)).length;
  const screeningCurrent = applications.filter(
    (app) => app.status === "SCREENING",
  ).length;

  let responses = 0;
  let screenings = 0;
  let interviews = 0;
  let offers = 0;

  const volumeMap = new Map<string, number>();
  const positionMap = new Map<
    string,
    { applied: number; responses: number; interviews: number }
  >();

  let interviewCurrent = 0;
  let offerCurrent = 0;

  for (const app of applications) {
    const appEvents = eventsByApp.get(app.id) ?? [];
    const appComms = commsByApp.get(app.id) ?? [];
    const responded = hasMeaningfulResponse(app, appEvents, appComms);
    const reachedScreening = reachedStage(app, appEvents, "SCREENING");
    const reachedInterview = reachedStage(app, appEvents, "INTERVIEW");
    const reachedOffer = reachedStage(app, appEvents, "OFFER");

    if (responded) responses += 1;
    if (reachedScreening) screenings += 1;
    if (reachedInterview) interviews += 1;
    if (reachedOffer) offers += 1;
    if (app.status === "INTERVIEW") interviewCurrent += 1;
    if (app.status === "OFFER") offerCurrent += 1;

    const day = format(app.createdAt, "yyyy-MM-dd");
    volumeMap.set(day, (volumeMap.get(day) ?? 0) + 1);

    const position = app.position.trim() || "Unknown";
    const pos = positionMap.get(position) ?? {
      applied: 0,
      responses: 0,
      interviews: 0,
    };
    pos.applied += 1;
    if (responded) pos.responses += 1;
    if (reachedInterview) pos.interviews += 1;
    positionMap.set(position, pos);
  }

  const volume = [...volumeMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const byPosition = [...positionMap.entries()]
    .map(([position, stats]) => ({
      position,
      applied: stats.applied,
      responses: stats.responses,
      responseRate: stats.applied ? stats.responses / stats.applied : 0,
      interviews: stats.interviews,
    }))
    .sort((a, b) => b.applied - a.applied);

  return {
    total,
    active,
    rejected,
    ghosted,
    screenings: screeningCurrent,
    interviews: interviewCurrent,
    offers: offerCurrent,
    responseRate: total ? responses / total : 0,
    interviewRate: total ? interviews / total : 0,
    offerRate: total ? offers / total : 0,
    volume,
    funnel: [
      { stage: "Applications", count: total },
      { stage: "Responses", count: responses },
      { stage: "Screenings", count: screenings },
      { stage: "Interviews", count: interviews },
      { stage: "Offers", count: offers },
    ],
    outcomes: [
      { name: "Active", value: active },
      { name: "Ghosted", value: ghosted },
      { name: "Screening", value: screeningCurrent },
      { name: "Interview", value: interviewCurrent },
      { name: "Offer", value: offerCurrent },
      { name: "Rejected", value: rejected },
    ],
    byPosition,
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

export type { SerializedApplication };
