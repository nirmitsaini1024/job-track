import { z } from "zod";

export const recommendJobSchema = z.object({
  applicationId: z.string().uuid(),
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
