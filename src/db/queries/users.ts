import { asc, eq, ne } from "drizzle-orm";
import { getDb, users } from "@/db";

export async function findUserByUsername(username: string) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return user ?? null;
}

export async function findUserById(id: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function listUsernamesExcept(userId: string) {
  const db = getDb();
  return db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .where(ne(users.id, userId))
    .orderBy(asc(users.username));
}

export async function createUser(input: {
  username: string;
  passwordHash: string;
  onboardingCompleted?: boolean;
}) {
  const db = getDb();
  const [user] = await db.insert(users).values(input).returning();
  return user;
}

export async function markOnboardingCompleted(userId: string) {
  const db = getDb();
  const [user] = await db
    .update(users)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return user ?? null;
}
