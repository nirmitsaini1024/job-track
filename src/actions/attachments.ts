"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getApplication } from "@/db/queries/applications";
import {
  countApplicationAttachments,
  createAttachmentFromUpload,
  deleteOwnedAttachment,
} from "@/db/queries/attachments";
import { MAX_APPLICATION_ATTACHMENTS } from "@/lib/constants";
import { ImageKitConfigError } from "@/lib/imagekit";
import { getSession } from "@/lib/session";

export type AttachmentActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: unknown, fallback: string): AttachmentActionResult<never> {
  console.error("[attachment-action]", error);
  if (error instanceof ImageKitConfigError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? fallback };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: fallback };
}

export async function uploadApplicationAttachmentsAction(
  formData: FormData,
): Promise<AttachmentActionResult<{ uploaded: number }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { ok: false, error: "You must be signed in." };
    }

    const applicationId = z
      .string()
      .uuid()
      .parse(formData.get("applicationId"));
    const existing = await getApplication(applicationId, session.userId);
    if (!existing) {
      return { ok: false, error: "Application not found." };
    }

    const files = formData
      .getAll("images")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (!files.length) {
      return { ok: false, error: "Choose or paste at least one image." };
    }

    const currentCount = await countApplicationAttachments(applicationId);
    if (currentCount + files.length > MAX_APPLICATION_ATTACHMENTS) {
      return {
        ok: false,
        error: `You can store up to ${MAX_APPLICATION_ATTACHMENTS} screenshots per application.`,
      };
    }

    let uploaded = 0;
    for (const file of files) {
      await createAttachmentFromUpload({
        applicationId,
        userId: session.userId,
        file,
      });
      uploaded += 1;
    }

    revalidatePath(`/applications/${applicationId}`);
    return { ok: true, data: { uploaded } };
  } catch (error) {
    return fail(error, "Unable to upload screenshots.");
  }
}

export async function deleteApplicationAttachmentAction(
  input: unknown,
): Promise<AttachmentActionResult<{ id: string }>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { ok: false, error: "You must be signed in." };
    }

    const { id } = z.object({ id: z.string().uuid() }).parse(input);
    const deleted = await deleteOwnedAttachment(id, session.userId);
    if (!deleted) {
      return { ok: false, error: "Screenshot not found." };
    }

    revalidatePath(`/applications/${deleted.applicationId}`);
    return { ok: true, data: { id: deleted.id } };
  } catch (error) {
    return fail(error, "Unable to delete screenshot.");
  }
}
