import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  userId: string;
  username: string;
  onboardingCompleted: boolean;
  expiresAt: string;
};

export const COOKIE_NAME = "session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function decrypt(session: string | undefined = "") {
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, getSecretKey(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      onboardingCompleted: Boolean(payload.onboardingCompleted),
      expiresAt:
        typeof payload.expiresAt === "string"
          ? payload.expiresAt
          : new Date().toISOString(),
    } satisfies SessionPayload;
  } catch {
    return null;
  }
}
