import { z } from "zod";
import { AiError, completeJson } from "./client";
import { QUESTION_EXTRACTION_SYSTEM_PROMPT } from "./prompts";

const questionExtractionSchema = z.object({
  questions: z.array(z.string()),
});

const questionExtractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    questions: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["questions"],
} as const;

export async function extractApplicationQuestions(input: {
  text?: string;
  images?: Array<{ mimeType: string; base64: string }>;
}): Promise<string[]> {
  const text = input.text?.trim() ?? "";
  const images = input.images ?? [];
  if (!text && images.length === 0) return [];

  const prompt = `Extract application form questions from this job posting content.

Job posting text:
${text || "(No text — use attached image(s) only.)"}`;

  const userContent: Parameters<typeof completeJson>[0]["messages"][number]["content"] =
    images.length > 0
      ? [
          { type: "text", text: prompt },
          ...images.map((image) => ({
            type: "image_url" as const,
            image_url: {
              url: `data:${image.mimeType};base64,${image.base64}`,
            },
          })),
        ]
      : prompt;

  const raw = await completeJson({
    schemaName: "application_question_extraction",
    jsonSchema: questionExtractionJsonSchema as unknown as Record<
      string,
      unknown
    >,
    messages: [
      { role: "system", content: QUESTION_EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const parsed = questionExtractionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiError("The AI returned data in an unexpected format.", "invalid");
  }

  return parsed.data.questions
    .map((question) => question.trim())
    .filter((question) => question.length > 0);
}
