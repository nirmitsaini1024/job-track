import { z } from "zod";
import {
  APPLICATION_STATUSES,
  REMOTE_TYPES,
  SALARY_PERIODS,
} from "@/lib/constants";

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
export const remoteTypeSchema = z.enum(REMOTE_TYPES);
export const salaryPeriodSchema = z.enum(SALARY_PERIODS);

export const applicationFiltersSchema = z.object({
  q: z.string().optional(),
  position: z.string().optional(),
  location: z.string().optional(),
  remoteType: remoteTypeSchema.optional(),
  status: applicationStatusSchema.optional(),
  source: z.string().optional(),
  salaryMin: z.coerce.number().int().nonnegative().optional(),
  salaryMax: z.coerce.number().int().nonnegative().optional(),
  experienceMin: z.coerce.number().int().nonnegative().optional(),
  experienceMax: z.coerce.number().int().nonnegative().optional(),
  appliedFrom: z.string().optional(),
  appliedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  ghosted: z.enum(["true", "false"]).optional(),
  sort: z
    .enum(["lastActivity", "appliedAt", "company", "status", "createdAt"])
    .optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type ApplicationFilters = z.infer<typeof applicationFiltersSchema>;

function optionalText(max: number) {
  return z.preprocess((value) => {
    if (value == null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }, z.string().max(max).nullable().optional());
}

function optionalInt() {
  return z.preprocess((value) => {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.round(value);
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.round(parsed) : value;
    }
    return value;
  }, z.number().int().nonnegative().nullable().optional());
}

function optionalEnum<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (value == null || value === "") return null;
    return value;
  }, schema.nullable().optional());
}

export const createApplicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(200),
  position: z.string().trim().min(1, "Position is required").max(200),
  location: optionalText(200),
  remoteType: remoteTypeSchema.default("UNKNOWN"),
  employmentType: optionalText(100),
  salaryMin: optionalInt(),
  salaryMax: optionalInt(),
  salaryCurrency: optionalText(10),
  salaryPeriod: optionalEnum(salaryPeriodSchema),
  experienceMin: optionalInt(),
  experienceMax: optionalInt(),
  description: z.string().max(50000).default(""),
  applicationUrl: optionalText(2000),
  source: optionalText(100),
  status: applicationStatusSchema.default("SAVED"),
  appliedAt: z.string().datetime().nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  questionAnswers: z
    .array(
      z.object({
        question: z.string().trim().min(1).max(2000),
        answer: z.string().trim().min(1).max(20000),
      }),
    )
    .max(50)
    .default([]),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = createApplicationSchema.partial().extend({
  id: z.string().uuid(),
});

export const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: applicationStatusSchema,
});

export const updateAppliedAtSchema = z.object({
  id: z.string().uuid(),
  appliedAt: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
      z.literal(""),
      z.null(),
    ])
    .optional(),
});

export const updateApplicationDetailsSchema = z.object({
  id: z.string().uuid(),
  company: z.string().trim().min(1, "Company is required").max(200),
  applicationUrl: z
    .union([z.string().trim().max(2000), z.literal(""), z.null()])
    .optional(),
  employmentType: z
    .union([z.string().trim().max(100), z.literal(""), z.null()])
    .optional(),
});

export const unmarkGhostedSchema = z.object({
  id: z.string().uuid(),
});

export const addNoteSchema = z.object({
  applicationId: z.string().uuid(),
  note: z.string().trim().min(1).max(10000),
});

export const applyEmailSchema = z.object({
  applicationId: z.string().uuid(),
  content: z.string().trim().min(1).max(50000),
  classification: z.enum(["REJECTED", "INTERVIEW", "SCREENING", "OFFER", "OTHER"]),
  confidence: z.number().min(0).max(1),
  summary: z.string().max(2000),
  reasoning: z.string().max(5000),
  applyStatus: z.boolean().default(true),
});

export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): ApplicationFilters {
  const flattened: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") flattened[key] = value;
    else if (Array.isArray(value) && value[0]) flattened[key] = value[0];
  }

  const parsed = applicationFiltersSchema.safeParse(flattened);
  return parsed.success ? parsed.data : {};
}

export function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
