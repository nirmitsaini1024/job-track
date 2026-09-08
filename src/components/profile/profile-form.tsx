"use client";

import { toast } from "sonner";
import { updateProfileAction } from "@/actions/profile";
import { CompleteResumeForm } from "@/components/profile/complete-resume-form";
import type { OnboardingFormState } from "@/lib/validations/onboarding";

export function ProfileForm({ initialValue }: { initialValue: string }) {
  async function saveProfile(
    state: OnboardingFormState,
    formData: FormData,
  ): Promise<OnboardingFormState> {
    const result = await updateProfileAction(state, formData);

    if (result.message?.toLowerCase().includes("saved")) {
      toast.success(result.message);
    } else if (result.errors?.completeResumeData?.[0]) {
      toast.error(result.errors.completeResumeData[0]);
    } else if (result.message) {
      toast.error(result.message);
    }

    return result;
  }

  return (
    <CompleteResumeForm
      action={saveProfile}
      initialValue={initialValue}
      submitLabel="Save profile"
      pendingLabel="Saving..."
    />
  );
}
