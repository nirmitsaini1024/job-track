"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { upsertUserProfile } from "@/db/queries/profiles";
import {
  createUser,
  findUserByUsername,
  markOnboardingCompleted,
} from "@/db/queries/users";
import { parseCompleteResumeData } from "@/lib/onboarding/parse-resume";
import { createSession, deleteSession, getSession } from "@/lib/session";
import {
  loginSchema,
  signupSchema,
  type AuthFormState,
} from "@/lib/validations/auth";
import {
  completeResumeSchema,
  type OnboardingFormState,
} from "@/lib/validations/onboarding";

function authFail(error: unknown, fallback: string): AuthFormState {
  console.error("[auth-action]", error);

  if (error instanceof Error) {
    if (error.message === "DATABASE_URL is not configured.") {
      return {
        message:
          "Database is not configured. Add DATABASE_URL to .env and restart the server.",
      };
    }
    if (error.message === "JWT_SECRET is not configured.") {
      return {
        message:
          "JWT_SECRET is not configured. Add JWT_SECRET to .env and restart the server.",
      };
    }
    const message = error.message.toLowerCase();
    if (
      message.includes("relation") &&
      (message.includes("does not exist") || message.includes("not find"))
    ) {
      return {
        message: "Database tables are missing. Run npm run db:push, then try again.",
      };
    }
  }

  return { message: fallback };
}

export async function signupAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { username, password } = parsed.data;

  try {
    const existing = await findUserByUsername(username);
    if (existing) {
      return { errors: { username: ["Username is already taken"] } };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      username,
      passwordHash,
      onboardingCompleted: false,
    });

    await createSession({
      userId: user.id,
      username: user.username,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    return authFail(error, "Could not create your account. Please try again.");
  }

  redirect("/onboarding");
}

export async function loginAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { username, password } = parsed.data;
  let onboardingCompleted = false;

  try {
    const user = await findUserByUsername(username);
    if (!user) {
      return { message: "Invalid username or password." };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { message: "Invalid username or password." };
    }

    onboardingCompleted = user.onboardingCompleted;
    await createSession({
      userId: user.id,
      username: user.username,
      onboardingCompleted: user.onboardingCompleted,
    });
  } catch (error) {
    return authFail(error, "Could not log you in. Please try again.");
  }

  redirect(onboardingCompleted ? "/" : "/onboarding");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function saveOnboardingAction(
  _state: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const parsed = completeResumeSchema.safeParse({
    completeResumeData: formData.get("completeResumeData"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const profile = parseCompleteResumeData(parsed.data.completeResumeData);

    await upsertUserProfile(session.userId, {
      resumeData: profile.resumeData,
      bestProjects: profile.bestProjects,
      proudProject: profile.proudProject,
      projectLinks: profile.projectLinks,
      hardestProject: profile.hardestProject,
      programmingInspiration: profile.programmingInspiration,
      rejectionPitch: profile.rejectionPitch,
    });

    const user = await markOnboardingCompleted(session.userId);
    if (!user) {
      return { message: "Could not update your profile. Please try again." };
    }

    await createSession({
      userId: user.id,
      username: user.username,
      onboardingCompleted: true,
    });
  } catch (error) {
    const failed = authFail(
      error,
      "Could not save your profile. Please try again.",
    );
    return { message: failed.message };
  }

  redirect("/");
}

export async function skipOnboardingAction() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const user = await markOnboardingCompleted(session.userId);
  if (!user) {
    redirect("/login");
  }

  await createSession({
    userId: user.id,
    username: user.username,
    onboardingCompleted: true,
  });

  redirect("/");
}
