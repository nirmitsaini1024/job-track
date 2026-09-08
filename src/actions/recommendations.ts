"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getApplication } from "@/db/queries/applications";
import {
  convertRecommendation,
  createRecommendations,
  dismissRecommendation,
} from "@/db/queries/recommendations";
import { listUsernamesExcept } from "@/db/queries/users";
import { getSession } from "@/lib/session";
import { normalizeJobUrl } from "@/lib/job-url";
import {
  convertRecommendationSchema,
  recommendJobSchema,
  recommendationIdSchema,
} from "@/lib/validations/recommendation";
import type { RemoteType, SalaryPeriod } from "@/db/schema";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: unknown, fallback: string): ActionResult<never> {
  console.error("[recommendation-action]", error);

  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? fallback };
  }

  if (error instanceof Error) {
    if (error.message === "JOB_URL_REQUIRED") {
      return {
        ok: false,
        error: "Add a job URL before recommending this application.",
      };
    }
    if (error.message === "NO_RECIPIENTS") {
      return { ok: false, error: "Select at least one person." };
    }
    if (error.message === "INVALID_RECIPIENT") {
      return { ok: false, error: "One or more selected users were not found." };
    }
    if (error.message === "ALREADY_RECOMMENDED") {
      return {
        ok: false,
        error: "This job is already in those users’ recommendation feeds.",
      };
    }
    if (error.message === "DATABASE_URL is not configured.") {
      return {
        ok: false,
        error: "Database is not configured. Add DATABASE_URL to .env.",
      };
    }
  }

  return { ok: false, error: fallback };
}

export async function listRecommendableUsersAction(): Promise<
  ActionResult<Array<{ id: string; username: string }>>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { ok: false, error: "You must be signed in." };
    }
    const users = await listUsernamesExcept(session.userId);
    return { ok: true, data: users };
  } catch (error) {
    return fail(error, "Unable to load users.");
  }
}

export async function recommendJobAction(
  input: unknown,
): Promise<
  ActionResult<{ created: number; skipped: string[]; usernames: string[] }>
> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { ok: false, error: "You must be signed in." };
    }

    const data = recommendJobSchema.parse(input);
    const application = await getApplication(data.applicationId, session.userId);
    if (!application) {
      return { ok: false, error: "Application not found." };
    }

    if (!normalizeJobUrl(application.applicationUrl)) {
      return {
        ok: false,
        error: "Add a job URL before recommending this application.",
      };
    }

    const result = await createRecommendations({
      fromUserId: session.userId,
      toUserIds: data.toUserIds,
      sourceApplicationId: application.id,
      company: application.company,
      position: application.position,
      location: application.location,
      remoteType: application.remoteType as RemoteType,
      employmentType: application.employmentType,
      salaryMin: application.salaryMin,
      salaryMax: application.salaryMax,
      salaryCurrency: application.salaryCurrency,
      salaryPeriod: application.salaryPeriod as SalaryPeriod | null,
      experienceMin: application.experienceMin,
      experienceMax: application.experienceMax,
      description: application.description,
      applicationUrl: application.applicationUrl!,
      source: application.source,
      skills: application.skills,
    });

    revalidatePath("/recommendations");
    revalidatePath(`/applications/${application.id}`);

    return { ok: true, data: result };
  } catch (error) {
    return fail(error, "Unable to recommend this job.");
  }
}

export async function dismissRecommendationAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { ok: false, error: "You must be signed in." };
    }

    const { id } = recommendationIdSchema.parse(input);
    const updated = await dismissRecommendation(id, session.userId);
    if (!updated) {
      return { ok: false, error: "Recommendation not found." };
    }

    revalidatePath("/recommendations");
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error, "Unable to remove this recommendation.");
  }
}

export async function convertRecommendationAction(
  input: unknown,
): Promise<ActionResult<{ applicationId: string }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { ok: false, error: "You must be signed in." };
    }

    const data = convertRecommendationSchema.parse(input);
    const result = await convertRecommendation({
      recommendationId: data.id,
      userId: session.userId,
      status: data.status,
    });
    if (!result) {
      return { ok: false, error: "Recommendation not found." };
    }

    revalidatePath("/recommendations");
    revalidatePath("/applications");
    revalidatePath("/");
    revalidatePath(`/applications/${result.applicationId}`);

    return { ok: true, data: { applicationId: result.applicationId } };
  } catch (error) {
    return fail(error, "Unable to save this recommendation.");
  }
}
