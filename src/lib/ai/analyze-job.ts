import { AiError, completeJson } from "./client";
import { analyzeQuestionnaire } from "./analyze-questionnaire";
import { extractApplicationQuestions } from "./extract-questions";
import { JOB_SYSTEM_PROMPT, JOB_USER_PROMPT } from "./prompts";
import { enrichQuestionAnswers } from "./resume-context";
import {
  jobExtractionJsonSchema,
  jobExtractionSchema,
  type JobExtraction,
} from "./schemas";

export type AnalyzeJobInput = {
  text?: string;
  images?: Array<{
    mimeType: string;
    base64: string;
  }>;
  /** @deprecated prefer images[] */
  image?: {
    mimeType: string;
    base64: string;
  };
  source?: string | null;
  applicationUrl?: string | null;
  resumeData?: string | null;
};

export async function analyzeJob(input: AnalyzeJobInput): Promise<JobExtraction> {
  const text = input.text?.trim() ?? "";
  const images = [
    ...(input.images ?? []),
    ...(input.image ? [input.image] : []),
  ];
  const resumeData = input.resumeData?.trim() ?? "";

  if (!text && images.length === 0) {
    throw new AiError(
      "Paste a job description, questions, and/or images to analyze.",
      "empty",
    );
  }

  const resumeBlock = resumeData
    ? `\n\nCandidate resume profile (use ONLY to answer questions; never invent questions from this):\n${resumeData}`
    : `\n\nCandidate resume profile:\n(No resume profile was provided. If questions exist in the JD, note that resume data is missing.)`;

  const promptText = `${JOB_USER_PROMPT}

Job posting input (source of truth for which questions exist):
${text || "(Job description / questions are in the attached image(s).)"}
${resumeBlock}`;

  const userContent: Parameters<typeof completeJson>[0]["messages"][number]["content"] =
    images.length > 0
      ? [
          { type: "text", text: promptText },
          ...images.map((image) => ({
            type: "image_url" as const,
            image_url: {
              url: `data:${image.mimeType};base64,${image.base64}`,
            },
          })),
        ]
      : promptText;

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

  let cleanedQuestions = (result.questions ?? [])
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question.length > 0);

  // Fallback: dedicated pass to find form questions (especially from screenshots).
  if (cleanedQuestions.length === 0) {
    const extracted = await extractApplicationQuestions({ text, images });
    if (extracted.length && resumeData) {
      cleanedQuestions = await analyzeQuestionnaire({
        questions: extracted,
        resumeData,
      });
    } else if (extracted.length) {
      cleanedQuestions = extracted.map((question) => ({
        question,
        answer: "Resume data missing — add profile resume to draft answers.",
      }));
    }
  }

  result.questions = resumeData
    ? enrichQuestionAnswers(cleanedQuestions, resumeData)
    : cleanedQuestions;

  return result;
}
