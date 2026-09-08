import { z } from "zod";

export const completeResumeSchema = z.object({
  completeResumeData: z
    .string()
    .trim()
    .min(1, "Paste your resume / profile details to continue")
    .max(500_000, "Content is too long (max ~500k characters)"),
});

export type OnboardingFormState = {
  errors?: {
    completeResumeData?: string[];
  };
  message?: string;
};
