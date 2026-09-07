import { AiError, completeJson } from "./client";
import { JOB_SYSTEM_PROMPT, JOB_USER_PROMPT } from "./prompts";
import {
  jobExtractionJsonSchema,
  jobExtractionSchema,
  type JobExtraction,
} from "./schemas";

export type AnalyzeJobInput = {
  text?: string;
  image?: {
    mimeType: string;
    base64: string;
  };
  source?: string | null;
  applicationUrl?: string | null;
};

export async function analyzeJob(input: AnalyzeJobInput): Promise<JobExtraction> {
  const text = input.text?.trim() ?? "";
  if (!text && !input.image) {
    throw new AiError("Paste a job description or upload a screenshot.", "empty");
  }

  const userContent: Parameters<typeof completeJson>[0]["messages"][number]["content"] =
    input.image
      ? [
          {
            type: "text",
            text: `${JOB_USER_PROMPT}\n\n${text || "(Job description is in the attached image.)"}`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${input.image.mimeType};base64,${input.image.base64}`,
            },
          },
        ]
      : `${JOB_USER_PROMPT}\n\n${text}`;

  const raw = await completeJson({
    schemaName: "job_extraction",
    jsonSchema: jobExtractionJsonSchema as unknown as Record<string, unknown>,
    messages: [
      { role: "system", content: JOB_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const parsed = jobExtractionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiError("The AI returned data in an unexpected format.", "invalid");
  }

  const result = parsed.data;
  if (input.source && !result.source) {
    result.source = input.source;
  }
  if (input.applicationUrl && !result.applicationUrl) {
    result.applicationUrl = input.applicationUrl;
  }

  if (result.salary && result.salary.min == null && result.salary.max == null) {
    result.salary = null;
  }
  if (
    result.experience &&
    result.experience.min == null &&
    result.experience.max == null
  ) {
    result.experience = null;
  }

  return result;
}
