"use client";

import { saveOnboardingAction, skipOnboardingAction } from "@/actions/auth";
import { CompleteResumeForm } from "@/components/profile/complete-resume-form";
import { Button } from "@/components/ui/button";

export function OnboardingForm() {
  return (
    <CompleteResumeForm
      action={saveOnboardingAction}
      submitLabel="Save and continue"
      pendingLabel="Saving..."
      footer={
        <form action={skipOnboardingAction}>
          <Button type="submit" variant="outline" className="w-full">
            Skip for now
          </Button>
        </form>
      }
    />
  );
}
