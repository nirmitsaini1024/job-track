import { and, asc, desc, eq, exists, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { format } from "date-fns";
import { getDb } from "@/db";
import {
  applicationEvents,
  applications,
  applicationSkills,
  communications,
  type ApplicationStatus,
  type NewApplication,
} from "@/db/schema";
import { isEligibleForGhost, isGhosted, GHOST_THRESHOLD_DAYS } from "@/lib/ghosted";
import type { ApplicationFilters } from "@/lib/validations/application";
import { listApplicationAttachments } from "@/db/queries/attachments";

export type SerializedApplication = {
  id: string;
  company: string;
  position: string;
  location: string | null;
  remoteType: string;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  description: string;
  applicationUrl: string | null;
  source: string | null;
  questionAnswers: Array<{ question: string; answer: string }>;
  status: ApplicationStatus;
  appliedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  skills: string[];
  isGhosted: boolean;
};

function serialize(
  row: typeof applications.$inferSelect,
  skills: string[] = [],
): SerializedApplication {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    location: row.location,
    remoteType: row.remoteType,
    employmentType: row.employmentType,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryCurrency: row.salaryCurrency,
    salaryPeriod: row.salaryPeriod,
    experienceMin: row.experienceMin,
    experienceMax: row.experienceMax,
    description: row.description,
    applicationUrl: row.applicationUrl,
    source: row.source,
    questionAnswers: row.questionAnswers ?? [],
    status: row.status,
    appliedAt: row.appliedAt?.toISOString() ?? null,
    lastActivityAt: row.lastActivityAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    skills,
    isGhosted: isGhosted(row),
  };
}

function dateFrom(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildApplicationConditions(
  filters: ApplicationFilters = {},
  ownerId?: string,
): SQL[] {
  const conditions: SQL[] = [];

  if (ownerId) {
    conditions.push(eq(applications.ownerId, ownerId));
  }

  if (filters.position) {
    conditions.push(ilike(applications.position, `%${filters.position}%`));
  }
  if (filters.location) {
    conditions.push(ilike(applications.location, `%${filters.location}%`));
  }
  if (filters.remoteType) {
    conditions.push(eq(applications.remoteType, filters.remoteType));
  }
  if (filters.status) {
    conditions.push(eq(applications.status, filters.status));
  }
  if (filters.source) {
    conditions.push(ilike(applications.source, `%${filters.source}%`));
  }
  if (filters.salaryMin != null) {
    conditions.push(
      sql`coalesce(${applications.salaryMax}, ${applications.salaryMin}) >= ${filters.salaryMin}`,
    );
  }
  if (filters.salaryMax != null) {
    conditions.push(
      sql`coalesce(${applications.salaryMin}, ${applications.salaryMax}) <= ${filters.salaryMax}`,
    );
  }
  if (filters.experienceMin != null) {
    conditions.push(
      sql`coalesce(${applications.experienceMax}, ${applications.experienceMin}) >= ${filters.experienceMin}`,
    );
  }
  if (filters.experienceMax != null) {
    conditions.push(
      sql`coalesce(${applications.experienceMin}, ${applications.experienceMax}) <= ${filters.experienceMax}`,
    );
  }

  const appliedFrom = dateFrom(filters.appliedFrom);
  const appliedTo = dateFrom(filters.appliedTo);
  if (appliedFrom) conditions.push(gte(applications.appliedAt, appliedFrom));
  if (appliedTo) conditions.push(lte(applications.appliedAt, appliedTo));

  const createdFrom = dateFrom(filters.dateFrom);
  const createdTo = dateFrom(filters.dateTo);
  if (createdFrom) conditions.push(gte(applications.createdAt, createdFrom));
  if (createdTo) {
    const end = new Date(createdTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(applications.createdAt, end));
  }

  if (filters.q) {
    const term = `%${filters.q}%`;
    const skillMatch = exists(
      getDb()
        .select({ id: applicationSkills.id })
        .from(applicationSkills)
        .where(
          and(
            eq(applicationSkills.applicationId, applications.id),
            ilike(applicationSkills.skill, term),
          ),
        ),
    );

    conditions.push(
      or(
        ilike(applications.company, term),
        ilike(applications.position, term),
        ilike(applications.location, term),
        skillMatch,
      )!,
    );
  }

  return conditions;
}

export async function getApplications(
  filters: ApplicationFilters = {},
  ownerId?: string,
) {
  const db = getDb();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const conditions = buildApplicationConditions(filters, ownerId);
  const where = conditions.length ? and(...conditions) : undefined;

  const sortColumn =
    filters.sort === "company"
      ? applications.company
      : filters.sort === "status"
        ? applications.status
        : filters.sort === "appliedAt"
          ? applications.appliedAt
          : filters.sort === "createdAt"
            ? applications.createdAt
            : applications.lastActivityAt;
  const direction = filters.order === "asc" ? asc : desc;

  const rows = await db
    .select()
    .from(applications)
    .where(where)
    .orderBy(direction(sortColumn));

  const withGhost = rows.map((row) => serialize(row));
  const ghostFiltered =
    filters.ghosted === "true"
      ? withGhost.filter((row) => row.isGhosted)
      : filters.ghosted === "false"
        ? withGhost.filter((row) => !row.isGhosted)
        : withGhost;

  const start = (page - 1) * pageSize;
  const pageRows = ghostFiltered.slice(start, start + pageSize);
  const ids = pageRows.map((row) => row.id);

  const skills =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(applicationSkills)
          .where(inArray(applicationSkills.applicationId, ids));

  const skillsByApp = new Map<string, string[]>();
  for (const skill of skills) {
    const list = skillsByApp.get(skill.applicationId) ?? [];
    list.push(skill.skill);
    skillsByApp.set(skill.applicationId, list);
  }

  return {
    items: pageRows.map((row) => ({
      ...row,
      skills: skillsByApp.get(row.id) ?? [],
    })),
    total: ghostFiltered.length,
    page,
    pageSize,
  };
}

export async function getApplication(id: string, ownerId?: string) {
  const db = getDb();
  const conditions = [eq(applications.id, id)];
  if (ownerId) {
    conditions.push(eq(applications.ownerId, ownerId));
  }

  const [row] = await db
    .select()
    .from(applications)
    .where(and(...conditions))
    .limit(1);

  if (!row) return null;

  const [skills, events, comms, attachments] = await Promise.all([
    db
      .select()
      .from(applicationSkills)
      .where(eq(applicationSkills.applicationId, id)),
    db
      .select()
      .from(applicationEvents)
      .where(eq(applicationEvents.applicationId, id))
      .orderBy(desc(applicationEvents.createdAt)),
    db
      .select()
      .from(communications)
      .where(eq(communications.applicationId, id))
      .orderBy(desc(communications.createdAt)),
    listApplicationAttachments(id),
  ]);

  return {
    ...serialize(
      row,
      skills.map((s) => s.skill),
    ),
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      description: event.description,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
    })),
    communications: comms.map((item) => ({
      id: item.id,
      type: item.type,
      content: item.content,
      aiClassification: item.aiClassification,
      aiConfidence: item.aiConfidence,
      aiSummary: item.aiSummary,
      aiReasoning: item.aiReasoning,
      createdAt: item.createdAt.toISOString(),
    })),
    attachments,
  };
}

export async function createApplication(
  input: NewApplication & { skills?: string[] },
) {
  const db = getDb();
  const now = new Date();
  const { skills = [], ...values } = input;

  const [created] = await db
    .insert(applications)
    .values({
      ...values,
      lastActivityAt: values.lastActivityAt ?? now,
      updatedAt: now,
    })
    .returning();

  const uniqueSkills = [...new Set(skills.map((s) => s.trim()).filter(Boolean))];
  if (uniqueSkills.length) {
    await db.insert(applicationSkills).values(
      uniqueSkills.map((skill) => ({
        applicationId: created.id,
        skill,
      })),
    );
  }

  await db.insert(applicationEvents).values({
    applicationId: created.id,
    type: "APPLICATION_CREATED",
    description: `Saved ${created.position} at ${created.company}`,
    metadata: { status: created.status },
  });

  return serialize(created, uniqueSkills);
}

export async function deleteApplication(id: string) {
  const { deleteAttachmentsForApplication } = await import(
    "@/db/queries/attachments"
  );
  await deleteAttachmentsForApplication(id);

  const db = getDb();
  const [deleted] = await db
    .delete(applications)
    .where(eq(applications.id, id))
    .returning({ id: applications.id });

  return deleted ?? null;
}

export async function updateApplication(
  id: string,
  input: Partial<NewApplication> & { skills?: string[] },
) {
  const db = getDb();
  const existing = await getApplication(id);
  if (!existing) return null;

  const { skills, ...values } = input;
  const now = new Date();

  const [updated] = await db
    .update(applications)
    .set({
      ...values,
      updatedAt: now,
      lastActivityAt: now,
    })
    .where(eq(applications.id, id))
    .returning();

  if (skills) {
    await db
      .delete(applicationSkills)
      .where(eq(applicationSkills.applicationId, id));
    const uniqueSkills = [...new Set(skills.map((s) => s.trim()).filter(Boolean))];
    if (uniqueSkills.length) {
      await db.insert(applicationSkills).values(
        uniqueSkills.map((skill) => ({
          applicationId: id,
          skill,
        })),
      );
    }
  }

  return serialize(updated, skills ?? existing.skills);
}

export async function updateApplicationDetails(
  id: string,
  input: {
    company: string;
    applicationUrl: string | null;
    employmentType: string | null;
  },
) {
  const db = getDb();
  const [current] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  if (!current) return null;

  const company = input.company.trim();
  const applicationUrl = input.applicationUrl?.trim() || null;
  const employmentType = input.employmentType?.trim() || null;
  if (
    current.company === company &&
    (current.applicationUrl ?? null) === applicationUrl &&
    (current.employmentType ?? null) === employmentType
  ) {
    return serialize(current);
  }

  const now = new Date();
  const [updated] = await db
    .update(applications)
    .set({
      company,
      applicationUrl,
      employmentType,
      updatedAt: now,
    })
    .where(eq(applications.id, id))
    .returning();

  const changes: string[] = [];
  if (current.company !== company) {
    changes.push(`Company updated to ${company}`);
  }
  if ((current.applicationUrl ?? null) !== applicationUrl) {
    changes.push(
      applicationUrl
        ? `Application link updated to ${applicationUrl}`
        : "Application link cleared",
    );
  }
  if ((current.employmentType ?? null) !== employmentType) {
    changes.push(
      employmentType
        ? `Employment type updated to ${employmentType}`
        : "Employment type cleared",
    );
  }

  if (changes.length) {
    await db.insert(applicationEvents).values({
      applicationId: id,
      type: "NOTE_ADDED",
      description: changes.join(". "),
      metadata: {
        reason: "update_details",
        company,
        applicationUrl,
        employmentType,
      },
    });
  }

  return serialize(updated);
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
) {
  const db = getDb();
  const [current] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  if (!current) return null;
  if (current.status === status) return serialize(current);

  const now = new Date();
  const [updated] = await db
    .update(applications)
    .set({
      status,
      updatedAt: now,
      lastActivityAt: now,
      ghosted: false,
      appliedAt:
        status === "APPLIED" && !current.appliedAt ? now : current.appliedAt,
    })
    .where(eq(applications.id, id))
    .returning();

  await db.insert(applicationEvents).values({
    applicationId: id,
    type: "STATUS_CHANGED",
    description: `Status changed from ${current.status} to ${status}`,
    metadata: { from: current.status, to: status },
  });

  return serialize(updated);
}

export async function updateApplicationAppliedAt(
  id: string,
  appliedAt: Date | null,
) {
  const db = getDb();
  const [current] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  if (!current) return null;

  const currentTime = current.appliedAt?.getTime() ?? null;
  const nextTime = appliedAt?.getTime() ?? null;
  if (currentTime === nextTime) return serialize(current);

  const now = new Date();
  const [updated] = await db
    .update(applications)
    .set({
      appliedAt,
      updatedAt: now,
    })
    .where(eq(applications.id, id))
    .returning();

  await db.insert(applicationEvents).values({
    applicationId: id,
    type: "NOTE_ADDED",
    description: appliedAt
      ? `Applied date set to ${format(appliedAt, "dd/MM/yyyy")}`
      : "Applied date cleared",
    metadata: {
      reason: "update_applied_at",
      appliedAt: appliedAt?.toISOString() ?? null,
    },
  });

  return serialize(updated);
}

export async function createEvent(input: {
  applicationId: string;
  type: (typeof applicationEvents.$inferInsert)["type"];
  description: string;
  metadata?: Record<string, unknown>;
  touchActivity?: boolean;
}) {
  const db = getDb();
  const [event] = await db
    .insert(applicationEvents)
    .values({
      applicationId: input.applicationId,
      type: input.type,
      description: input.description,
      metadata: input.metadata,
    })
    .returning();

  if (input.touchActivity !== false) {
    const now = new Date();
    await db
      .update(applications)
      .set({ lastActivityAt: now, updatedAt: now, ghosted: false })
      .where(eq(applications.id, input.applicationId));
  }

  return event;
}

export async function createCommunication(input: {
  applicationId: string;
  type?: (typeof communications.$inferInsert)["type"];
  content: string;
  aiClassification?: (typeof communications.$inferInsert)["aiClassification"];
  aiConfidence?: number | null;
  aiSummary?: string | null;
  aiReasoning?: string | null;
}) {
  const db = getDb();
  const [row] = await db
    .insert(communications)
    .values({
      applicationId: input.applicationId,
      type: input.type ?? "EMAIL",
      content: input.content,
      aiClassification: input.aiClassification,
      aiConfidence:
        input.aiConfidence == null
          ? null
          : Math.round(input.aiConfidence * 100),
      aiSummary: input.aiSummary,
      aiReasoning: input.aiReasoning,
    })
    .returning();

  const now = new Date();
  await db
    .update(applications)
    .set({ lastActivityAt: now, updatedAt: now, ghosted: false })
    .where(eq(applications.id, input.applicationId));

  return row;
}

export async function addNote(applicationId: string, note: string) {
  return createEvent({
    applicationId,
    type: "NOTE_ADDED",
    description: note,
  });
}

export async function getApplicationsForAnalytics(
  filters: ApplicationFilters = {},
  ownerId?: string,
) {
  const db = getDb();
  const conditions = buildApplicationConditions(filters, ownerId);
  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db.select().from(applications).where(where);
  const ghostFiltered =
    filters.ghosted === "true"
      ? rows.filter((row) => isGhosted(row))
      : filters.ghosted === "false"
        ? rows.filter((row) => !isGhosted(row))
        : rows;

  const ids = ghostFiltered.map((row) => row.id);
  const events =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(applicationEvents)
          .where(inArray(applicationEvents.applicationId, ids));

  const comms =
    ids.length === 0
      ? []
      : await db
          .select()
          .from(communications)
          .where(inArray(communications.applicationId, ids));

  return { applications: ghostFiltered, events, communications: comms };
}

export async function markStaleApplicationsGhosted(ownerId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.ownerId, ownerId));

  const eligible = rows.filter((row) => isEligibleForGhost(row));
  if (!eligible.length) {
    return { marked: 0, ids: [] as string[] };
  }

  const now = new Date();
  const ids = eligible.map((row) => row.id);

  await db
    .update(applications)
    .set({ ghosted: true, updatedAt: now })
    .where(inArray(applications.id, ids));

  for (const row of eligible) {
    await db.insert(applicationEvents).values({
      applicationId: row.id,
      type: "NOTE_ADDED",
      description: `Marked as ghosted after ${GHOST_THRESHOLD_DAYS} days with no activity`,
      metadata: {
        reason: "analyse_ghosted",
        thresholdDays: GHOST_THRESHOLD_DAYS,
      },
    });
  }

  return { marked: ids.length, ids };
}

export async function unmarkApplicationGhosted(id: string) {
  const db = getDb();
  const [current] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  if (!current) return null;

  const now = new Date();
  const [updated] = await db
    .update(applications)
    .set({
      ghosted: false,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(applications.id, id))
    .returning();

  await db.insert(applicationEvents).values({
    applicationId: id,
    type: "NOTE_ADDED",
    description: "Unmarked as ghosted",
    metadata: { reason: "unmark_ghosted" },
  });

  return serialize(updated);
}
