import { and, desc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  applications,
  jobRecommendations,
  users,
  type ApplicationStatus,
  type RemoteType,
  type SalaryPeriod,
} from "@/db/schema";
import { normalizeJobUrl } from "@/lib/job-url";
import { createApplication } from "@/db/queries/applications";

export type SerializedRecommendation = {
  id: string;
  company: string;
  position: string;
  location: string | null;
  remoteType: RemoteType;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  experienceMin: number | null;
  experienceMax: number | null;
  description: string;
  applicationUrl: string;
  source: string | null;
  skills: string[];
  status: string;
  fromUsername: string;
  createdAt: string;
};

function serialize(
  row: typeof jobRecommendations.$inferSelect,
  fromUsername: string,
): SerializedRecommendation {
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
    skills: row.skills ?? [],
    status: row.status,
    fromUsername,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createRecommendation(input: {
  fromUserId: string;
  toUserId: string;
  sourceApplicationId: string;
  company: string;
  position: string;
  location: string | null;
  remoteType: RemoteType;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  experienceMin: number | null;
  experienceMax: number | null;
  description: string;
  applicationUrl: string;
  source: string | null;
  skills: string[];
}) {
  const db = getDb();
  const url = normalizeJobUrl(input.applicationUrl);
  if (!url) {
    throw new Error("JOB_URL_REQUIRED");
  }

  const existing = await db
    .select({ id: jobRecommendations.id })
    .from(jobRecommendations)
    .where(
      and(
        eq(jobRecommendations.toUserId, input.toUserId),
        eq(jobRecommendations.status, "PENDING"),
        sql`lower(regexp_replace(trim(${jobRecommendations.applicationUrl}), '/+$', '')) = ${url.replace(/\/+$/, "")}`,
      ),
    )
    .limit(1);

  // Fallback: compare normalized in JS if SQL match is brittle
  const pendingForUser = await db
    .select()
    .from(jobRecommendations)
    .where(
      and(
        eq(jobRecommendations.toUserId, input.toUserId),
        eq(jobRecommendations.status, "PENDING"),
      ),
    );

  const duplicate = pendingForUser.find(
    (row) => normalizeJobUrl(row.applicationUrl) === url,
  );
  if (duplicate || existing[0]) {
    throw new Error("ALREADY_RECOMMENDED");
  }

  const [created] = await db
    .insert(jobRecommendations)
    .values({
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      sourceApplicationId: input.sourceApplicationId,
      company: input.company,
      position: input.position,
      location: input.location,
      remoteType: input.remoteType,
      employmentType: input.employmentType,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      salaryCurrency: input.salaryCurrency,
      salaryPeriod: input.salaryPeriod,
      experienceMin: input.experienceMin,
      experienceMax: input.experienceMax,
      description: input.description,
      applicationUrl: input.applicationUrl.trim(),
      source: input.source,
      skills: input.skills,
      status: "PENDING",
    })
    .returning();

  return created;
}

export async function listPendingRecommendationsForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      recommendation: jobRecommendations,
      fromUsername: users.username,
    })
    .from(jobRecommendations)
    .innerJoin(users, eq(users.id, jobRecommendations.fromUserId))
    .where(
      and(
        eq(jobRecommendations.toUserId, userId),
        eq(jobRecommendations.status, "PENDING"),
      ),
    )
    .orderBy(desc(jobRecommendations.createdAt));

  return rows.map((row) => serialize(row.recommendation, row.fromUsername));
}

export async function countPendingRecommendationsForUser(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(jobRecommendations)
    .where(
      and(
        eq(jobRecommendations.toUserId, userId),
        eq(jobRecommendations.status, "PENDING"),
      ),
    );
  return row?.count ?? 0;
}

export async function dismissRecommendation(
  recommendationId: string,
  userId: string,
) {
  const db = getDb();
  const now = new Date();
  const [updated] = await db
    .update(jobRecommendations)
    .set({ status: "DISMISSED", updatedAt: now })
    .where(
      and(
        eq(jobRecommendations.id, recommendationId),
        eq(jobRecommendations.toUserId, userId),
        eq(jobRecommendations.status, "PENDING"),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function convertRecommendation(input: {
  recommendationId: string;
  userId: string;
  status: Extract<ApplicationStatus, "SAVED" | "APPLIED">;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(jobRecommendations)
    .where(
      and(
        eq(jobRecommendations.id, input.recommendationId),
        eq(jobRecommendations.toUserId, input.userId),
        eq(jobRecommendations.status, "PENDING"),
      ),
    )
    .limit(1);

  if (!row) return null;

  const now = new Date();
  const created = await createApplication({
    ownerId: input.userId,
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
    source: row.source ?? `Recommended by user`,
    status: input.status,
    appliedAt: input.status === "APPLIED" ? now : null,
    skills: row.skills ?? [],
  });

  await db
    .update(jobRecommendations)
    .set({
      status: "CONVERTED",
      convertedApplicationId: created.id,
      updatedAt: now,
    })
    .where(eq(jobRecommendations.id, row.id));

  // Avoid double-clear from createApplication hook racing — already converted
  return { recommendationId: row.id, applicationId: created.id };
}

/** Clear pending recommendations for a user when they track the same job URL. */
export async function clearPendingRecommendationsForUrl(input: {
  userId: string;
  applicationUrl: string | null | undefined;
  convertedApplicationId?: string | null;
}) {
  const url = normalizeJobUrl(input.applicationUrl);
  if (!url) return 0;

  const db = getDb();
  const pending = await db
    .select()
    .from(jobRecommendations)
    .where(
      and(
        eq(jobRecommendations.toUserId, input.userId),
        eq(jobRecommendations.status, "PENDING"),
      ),
    );

  const matches = pending.filter(
    (row) => normalizeJobUrl(row.applicationUrl) === url,
  );
  if (!matches.length) return 0;

  const now = new Date();
  for (const row of matches) {
    await db
      .update(jobRecommendations)
      .set({
        status: "CONVERTED",
        convertedApplicationId: input.convertedApplicationId ?? null,
        updatedAt: now,
      })
      .where(eq(jobRecommendations.id, row.id));
  }

  return matches.length;
}
