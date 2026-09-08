import "server-only";

import { cookies } from "next/headers";
import {
  COOKIE_NAME,
  SESSION_DURATION_MS,
  encrypt,
  decrypt,
  type SessionPayload,
} from "@/lib/jwt";

export type { SessionPayload };
export { COOKIE_NAME, decrypt };

export async function createSession(input: {
  userId: string;
  username: string;
  onboardingCompleted: boolean;
}) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await encrypt({
    userId: input.userId,
    username: input.username,
    onboardingCompleted: input.onboardingCompleted,
    expiresAt: expiresAt.toISOString(),
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return decrypt(token);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
