"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { OnboardingFormState } from "@/lib/validations/onboarding";

const PLACEHOLDER = `Paste anything here — a full resume, project writeups, links, or answers like:

Resume data
...

Best projects you have built
...

Project you are most proud of
...

Project links
...

What is the hardest engineering project you have worked on? Why was it hard? (attach relevant Github/website/app links) *
...

[OPTIONAL] - Whose work do you look upto in programming and why?
...

[OPTIONAL] - If after reading all the other answers, we still want to reject you, what would you say to change our mind? (20 words max)
...`;

type CompleteResumeFormProps = {
  action: (
    state: OnboardingFormState,
    formData: FormData,
  ) => Promise<OnboardingFormState>;
  initialValue?: string;
  submitLabel: string;
  pendingLabel: string;
  footer?: React.ReactNode;
};

export function CompleteResumeForm({
  action,
  initialValue = "",
  submitLabel,
  pendingLabel,
  footer,
}: CompleteResumeFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [value, setValue] = useState(initialValue);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <p
            id="completeResumeData-label"
            className="text-sm font-medium leading-snug"
          >
            Complete resume data
          </p>
          <p className="text-sm text-muted-foreground">
            Paste your resume, projects, links, and any answers in one place. We
            save the full text as you wrote it.
          </p>
          <Textarea
            id="completeResumeData"
            name="completeResumeData"
            aria-labelledby="completeResumeData-label"
            placeholder={PLACEHOLDER}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-80 font-mono text-sm"
            required
          />
          <p className="text-xs text-muted-foreground">
            {value.length.toLocaleString()} characters
          </p>
          {state.errors?.completeResumeData?.map((error) => (
            <p key={error} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </form>

      {footer}
    </div>
  );
}
