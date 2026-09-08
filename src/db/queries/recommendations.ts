import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
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

type RecommendationPayload = {
  fromUserId: string;
  toUserIds: string[];
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

export async function createRecommendations(input: RecommendationPayload) {
  const db = getDb();
  const url = normalizeJobUrl(input.applicationUrl);
  if (!url) {
    throw new Error("JOB_URL_REQUIRED");
  }

  const uniqueToUserIds = [...new Set(input.toUserIds)].filter(
    (id) => id && id !== input.fromUserId,
  );
  if (!uniqueToUserIds.length) {
    throw new Error("NO_RECIPIENTS");
  }

  const recipients = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(inArray(users.id, uniqueToUserIds));

  if (recipients.length !== uniqueToUserIds.length) {
    throw new Error("INVALID_RECIPIENT");
  }

  const pending = await db
    .select()
    .from(jobRecommendations)
    .where(
      and(
        inArray(jobRecommendations.toUserId, uniqueToUserIds),
        eq(jobRecommendations.status, "PENDING"),
      ),
    );

  const alreadyPending = new Set(
    pending
      .filter((row) => normalizeJobUrl(row.applicationUrl) === url)
      .map((row) => row.toUserId),
  );

  const toCreate = recipients.filter((user) => !alreadyPending.has(user.id));
  const skipped = recipients
    .filter((user) => alreadyPending.has(user.id))
    .map((user) => user.username);

  if (!toCreate.length) {
    throw new Error("ALREADY_RECOMMENDED");
  }

  const created = await db
    .insert(jobRecommendations)
    .values(
      toCreate.map((user) => ({
        fromUserId: input.fromUserId,
        toUserId: user.id,
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
        status: "PENDING" as const,
      })),
    )
    .returning();

  return {
    created: created.length,
    skipped,
    usernames: toCreate.map((user) => user.username),
  };
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
  const [fromUser] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, row.fromUserId))
    .limit(1);

  // Mark first so createApplication's URL clear does not double-write oddly
  await db
    .update(jobRecommendations)
    .set({
      status: "CONVERTED",
      updatedAt: now,
    })
    .where(eq(jobRecommendations.id, row.id));

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
    source: fromUser?.username
      ? `Recommended by ${fromUser.username}`
      : "Recommended",
    status: input.status,
    appliedAt: input.status === "APPLIED" ? now : null,
    skills: row.skills ?? [],
  });

  await db
    .update(jobRecommendations)
    .set({
      convertedApplicationId: created.id,
      updatedAt: new Date(),
    })
    .where(eq(jobRecommendations.id, row.id));

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
