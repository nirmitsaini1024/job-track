import { eq } from "drizzle-orm";
import { getDb, userProfiles, type NewUserProfile } from "@/db";

export async function getUserProfile(userId: string) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return profile ?? null;
}

export async function upsertUserProfile(
  userId: string,
  data: Omit<NewUserProfile, "id" | "userId" | "createdAt" | "updatedAt">,
) {
  const db = getDb();
  const now = new Date();

  const [existing] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...data, updatedAt: now })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(userProfiles)
    .values({
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return created;
}
