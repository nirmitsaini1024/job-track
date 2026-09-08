import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, applicationAttachments, applications } from "@/db";
import {
  deleteImageKitFile,
  uploadApplicationImage,
} from "@/lib/imagekit";

export type SerializedAttachment = {
  id: string;
  applicationId: string;
  url: string;
  fileId: string;
  name: string;
  mimeType: string;
  createdAt: string;
};

function serialize(
  row: typeof applicationAttachments.$inferSelect,
): SerializedAttachment {
  return {
    id: row.id,
    applicationId: row.applicationId,
    url: row.url,
    fileId: row.fileId,
    name: row.name,
    mimeType: row.mimeType,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listApplicationAttachments(applicationId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(applicationAttachments)
    .where(eq(applicationAttachments.applicationId, applicationId))
    .orderBy(asc(applicationAttachments.createdAt));
  return rows.map(serialize);
}

export async function countApplicationAttachments(applicationId: string) {
  const rows = await listApplicationAttachments(applicationId);
  return rows.length;
}

export async function createAttachmentFromUpload(input: {
  applicationId: string;
  userId: string;
  file: File;
}) {
  const uploaded = await uploadApplicationImage({
    file: input.file,
    userId: input.userId,
    applicationId: input.applicationId,
  });

  const db = getDb();
  const [created] = await db
    .insert(applicationAttachments)
    .values({
      applicationId: input.applicationId,
      url: uploaded.url,
      fileId: uploaded.fileId,
      name: uploaded.name,
      mimeType: uploaded.mimeType,
    })
    .returning();

  return serialize(created);
}

export async function getOwnedAttachment(
  attachmentId: string,
  ownerId: string,
) {
  const db = getDb();
  const [row] = await db
    .select({
      attachment: applicationAttachments,
    })
    .from(applicationAttachments)
    .innerJoin(
      applications,
      eq(applicationAttachments.applicationId, applications.id),
    )
    .where(
      and(
        eq(applicationAttachments.id, attachmentId),
        eq(applications.ownerId, ownerId),
      ),
    )
    .limit(1);

  return row ? serialize(row.attachment) : null;
}

export async function deleteOwnedAttachment(
  attachmentId: string,
  ownerId: string,
) {
  const existing = await getOwnedAttachment(attachmentId, ownerId);
  if (!existing) return null;

  try {
    await deleteImageKitFile(existing.fileId);
  } catch (error) {
    console.error("[imagekit-delete]", error);
  }

  const db = getDb();
  await db
    .delete(applicationAttachments)
    .where(eq(applicationAttachments.id, attachmentId));

  return existing;
}

export async function deleteAttachmentsForApplication(applicationId: string) {
  const rows = await listApplicationAttachments(applicationId);
  for (const row of rows) {
    try {
      await deleteImageKitFile(row.fileId);
    } catch (error) {
      console.error("[imagekit-delete]", error);
    }
  }

  if (!rows.length) return;
  const db = getDb();
  await db
    .delete(applicationAttachments)
    .where(
      inArray(
        applicationAttachments.id,
        rows.map((row) => row.id),
      ),
    );
}
