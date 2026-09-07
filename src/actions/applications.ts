"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addNote as addNoteQuery,
  createApplication as createApplicationQuery,
  createCommunication,
  createEvent,
  deleteApplication as deleteApplicationQuery,
  getApplication,
  updateApplicationStatus as updateStatusQuery,
} from "@/db/queries/applications";
import {
  CLASSIFICATION_TO_EVENT,
  CLASSIFICATION_TO_STATUS,
} from "@/lib/constants";
import {
  addNoteSchema,
  applyEmailSchema,
  createApplicationSchema,
  updateStatusSchema,
} from "@/lib/validations/application";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: unknown, fallback: string): ActionResult<never> {
  console.error("[application-action]", error);

  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? fallback };
  }

  if (error instanceof Error) {
    if (error.message === "DATABASE_URL is not configured.") {
      return {
        ok: false,
        error: "Database is not configured. Add DATABASE_URL to .env and restart the server.",
      };
    }

    const message = error.message.toLowerCase();
    if (
      message.includes("relation") &&
      (message.includes("does not exist") || message.includes("not find"))
    ) {
      return {
        ok: false,
        error: "Database tables are missing. Run npm run db:push, then try again.",
      };
    }
  }

  return { ok: false, error: fallback };
}

export async function createApplicationAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = createApplicationSchema.parse(input);
    const urlValue = data.applicationUrl?.trim() ?? "";
    if (urlValue && !z.string().url().safeParse(urlValue).success) {
      return { ok: false, error: "Enter a valid job URL or leave it blank." };
    }
    const url = urlValue || null;

    const created = await createApplicationQuery({
      company: data.company,
      position: data.position,
      location: data.location ?? null,
      remoteType: data.remoteType,
      employmentType: data.employmentType ?? null,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      salaryCurrency: data.salaryCurrency ?? null,
      salaryPeriod: data.salaryPeriod ?? null,
      experienceMin: data.experienceMin ?? null,
      experienceMax: data.experienceMax ?? null,
      description: data.description,
      applicationUrl: url,
      source: data.source ?? null,
      status: data.status,
      appliedAt: data.appliedAt ? new Date(data.appliedAt) : data.status === "APPLIED" ? new Date() : null,
      skills: data.skills,
    });

    revalidatePath("/");
    revalidatePath("/applications");
    return { ok: true, data: { id: created.id } };
  } catch (error) {
    return fail(error, "Unable to save the application. Please try again.");
  }
}

export async function deleteApplicationAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(input);
    const existing = await getApplication(id);
    if (!existing) {
      return { ok: false, error: "Application not found." };
    }

    const deleted = await deleteApplicationQuery(id);
    if (!deleted) {
      return { ok: false, error: "Unable to delete this application." };
    }

    revalidatePath("/");
    revalidatePath("/applications");
    revalidatePath(`/applications/${id}`);
    return { ok: true, data: { id } };
  } catch (error) {
    return fail(error, "Unable to delete the application. Please try again.");
  }
}

export async function updateApplicationStatusAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = updateStatusSchema.parse(input);
    const existing = await getApplication(data.id);
    if (!existing) {
      return { ok: false, error: "Application not found." };
    }

    const updated = await updateStatusQuery(data.id, data.status);
    if (!updated) {
      return { ok: false, error: "Application not found." };
    }

    revalidatePath("/");
    revalidatePath("/applications");
    revalidatePath(`/applications/${data.id}`);
    return { ok: true, data: { id: updated.id } };
  } catch (error) {
    return fail(error, "Unable to update status.");
  }
}

export async function addNoteAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = addNoteSchema.parse(input);
    const existing = await getApplication(data.applicationId);
    if (!existing) {
      return { ok: false, error: "Application not found." };
    }

    const event = await addNoteQuery(data.applicationId, data.note);
    revalidatePath(`/applications/${data.applicationId}`);
    revalidatePath("/");
    revalidatePath("/applications");
    return { ok: true, data: { id: event.id } };
  } catch (error) {
    return fail(error, "Unable to add note.");
  }
}

export async function applyEmailAnalysisAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = applyEmailSchema.parse(input);
    const existing = await getApplication(data.applicationId);
    if (!existing) {
      return { ok: false, error: "Application not found." };
    }

    await createCommunication({
      applicationId: data.applicationId,
      type: "EMAIL",
      content: data.content,
      aiClassification: data.classification,
      aiConfidence: data.confidence,
      aiSummary: data.summary,
      aiReasoning: data.reasoning,
    });

    const eventType =
      data.classification === "OTHER"
        ? "EMAIL_RECEIVED"
        : CLASSIFICATION_TO_EVENT[data.classification];

    await createEvent({
      applicationId: data.applicationId,
      type: eventType,
      description:
        data.classification === "OTHER"
          ? data.summary || "Email received"
          : data.summary,
      metadata: {
        classification: data.classification,
        confidence: data.confidence,
      },
      touchActivity: true,
    });

    if (data.applyStatus && data.classification !== "OTHER") {
      const nextStatus = CLASSIFICATION_TO_STATUS[data.classification];
      if (nextStatus !== existing.status) {
        await updateStatusQuery(data.applicationId, nextStatus);
      }
    }

    revalidatePath("/");
    revalidatePath("/applications");
    revalidatePath(`/applications/${data.applicationId}`);
    return { ok: true, data: { id: data.applicationId } };
  } catch (error) {
    return fail(error, "Unable to save the email analysis.");
  }
}

