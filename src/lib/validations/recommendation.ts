import { z } from "zod";

export const recommendJobSchema = z.object({
  applicationId: z.string().uuid(),
  toUserIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one person")
    .max(50),
});

export const shareJobRecommendationSchema = z.object({
  applicationUrl: z.string().trim().url("Enter a valid job URL").max(2000),
  position: z.string().trim().min(1, "Role name is required").max(200),
  company: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value ? value : undefined)),
  note: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((value) => (value ? value : undefined)),
  toUserIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one person")
    .max(50),
});

export const recommendationIdSchema = z.object({
  id: z.string().uuid(),
});

export const convertRecommendationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["SAVED", "APPLIED"]),
});
