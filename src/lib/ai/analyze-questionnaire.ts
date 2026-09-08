import { z } from "zod";
import { AiError, completeJson } from "./client";
import {
  QUESTIONNAIRE_SYSTEM_PROMPT,
  QUESTIONNAIRE_USER_PROMPT,
} from "./prompts";

const questionnaireAnswersSchema = z.object({
  answers: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    }),
  ),
});

const questionnaireAnswersJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answers: {
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
  required: ["answers"],
} as const;

export async function analyzeQuestionnaire(input: {
  questions: string[];
  resumeData: string;
}) {
  const questions = input.questions.map((q) => q.trim()).filter(Boolean);
  if (!questions.length) {
    throw new AiError("No questionnaire questions to analyze.", "empty");
  }

  const resume = input.resumeData.trim();
  if (!resume) {
    throw new AiError(
      "Add resume data in Profile before analyzing the questionnaire.",
      "empty",
    );
  }

  const listed = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
  const prompt = `${QUESTIONNAIRE_USER_PROMPT}

Candidate resume profile:
${resume}

Questions to answer (return these exact question strings):
${listed}`;

  const raw = await completeJson({
    schemaName: "questionnaire_answers",
    jsonSchema: questionnaireAnswersJsonSchema as unknown as Record<
      string,
      unknown
    >,
    messages: [
      { role: "system", content: QUESTIONNAIRE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const parsed = questionnaireAnswersSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiError("The AI returned data in an unexpected format.", "invalid");
  }

  const byQuestion = new Map(
    parsed.data.answers.map((item) => [
      item.question.trim().toLowerCase(),
      item.answer.trim(),
    ]),
  );

  return questions.map((question) => ({
    question,
    answer:
      byQuestion.get(question.trim().toLowerCase()) ||
      parsed.data.answers.find(
        (item) =>
          item.question.trim().toLowerCase() === question.trim().toLowerCase(),
      )?.answer.trim() ||
      "",
  }));
}
