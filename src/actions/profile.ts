"use server";

import { revalidatePath } from "next/cache";
import { upsertUserProfile } from "@/db/queries/profiles";
import { requireSession } from "@/lib/auth";
import { parseCompleteResumeData } from "@/lib/onboarding/parse-resume";
import {
  completeResumeSchema,
  type OnboardingFormState,
} from "@/lib/validations/onboarding";

export async function updateProfileAction(
  _state: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const session = await requireSession();

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
  } catch (error) {
    console.error("[update-profile]", error);
    return { message: "Could not save your profile. Please try again." };
  }

  revalidatePath("/profile");
  return { message: "Profile saved" };
}
