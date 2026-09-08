import { z } from "zod";

export const remoteTypeSchema = z.enum(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]);
export const salaryPeriodSchema = z.enum(["YEAR", "MONTH", "HOUR", "UNKNOWN"]);

export const extractedSalarySchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  currency: z.string().nullable(),
  period: salaryPeriodSchema,
});

export const extractedExperienceSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
});

export const jobExtractionSchema = z.object({
  company: z.string().nullable(),
  position: z.string().nullable(),
  location: z.string().nullable(),
  remoteType: remoteTypeSchema,
  employmentType: z.string().nullable(),
  salary: extractedSalarySchema.nullable(),
  experience: extractedExperienceSchema.nullable(),
  skills: z.array(z.string()),
  description: z.string(),
  source: z.string().nullable(),
  applicationUrl: z.string().nullable(),
  questions: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .default([]),
});

export type JobExtraction = z.infer<typeof jobExtractionSchema>;

export const emailAnalysisSchema = z.object({
  classification: z.enum([
    "REJECTED",
    "INTERVIEW",
    "SCREENING",
    "OFFER",
    "OTHER",
  ]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  reasoning: z.string(),
});

export type EmailAnalysis = z.infer<typeof emailAnalysisSchema>;

const nullableString = {
  anyOf: [{ type: "string" }, { type: "null" }],
} as const;

const nullableNumber = {
  anyOf: [{ type: "number" }, { type: "null" }],
} as const;

export const jobExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    company: nullableString,
    position: nullableString,
    location: nullableString,
    remoteType: {
      type: "string",
      enum: ["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"],
    },
    employmentType: nullableString,
    salary: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            min: nullableNumber,
            max: nullableNumber,
            currency: nullableString,
            period: {
              type: "string",
              enum: ["YEAR", "MONTH", "HOUR", "UNKNOWN"],
            },
          },
          required: ["min", "max", "currency", "period"],
        },
        { type: "null" },
      ],
    },
    experience: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            min: nullableNumber,
            max: nullableNumber,
          },
          required: ["min", "max"],
        },
        { type: "null" },
      ],
    },
    skills: {
      type: "array",
      items: { type: "string" },
    },
    description: { type: "string" },
    source: nullableString,
    applicationUrl: nullableString,
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
      },
    },
  },
  required: [
    "company",
    "position",
    "location",
    "remoteType",
    "employmentType",
    "salary",
    "experience",
    "skills",
    "description",
    "source",
    "applicationUrl",
    "questions",
  ],
} as const;

export const emailAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    classification: {
      type: "string",
      enum: ["REJECTED", "INTERVIEW", "SCREENING", "OFFER", "OTHER"],
    },
    confidence: { type: "number" },
    summary: { type: "string" },
    reasoning: { type: "string" },
  },
  required: ["classification", "confidence", "summary", "reasoning"],
} as const;
