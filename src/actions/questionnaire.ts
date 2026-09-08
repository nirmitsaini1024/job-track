"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  dedupeSimilarQuestionsInBank,
  deleteUserQuestionnaireItem,
  listBankQuestions,
  listUserQuestionnaire,
  syncQuestionnaireContextToProfile,
  updateUserQuestionnaireAnswer,
  upsertUserQuestionnaireAnswers,
} from "@/db/queries/questionnaire";
import { getUserProfile } from "@/db/queries/profiles";
import { analyzeQuestionnaire, AiError } from "@/lib/ai";
import { buildResumeProfileText } from "@/lib/ai/resume-context";
import { requireSession } from "@/lib/auth";

export type QuestionnaireActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: unknown, fallback: string): QuestionnaireActionResult<never> {
  console.error("[questionnaire-action]", error);
  if (error instanceof AiError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof z.ZodError) {
    return { ok: false, error: error.issues[0]?.message ?? fallback };
  }
  if (error instanceof Error) {
    if (error.message === "DATABASE_URL is not configured.") {
      return {
        ok: false,
        error:
          "Database is not configured. Add DATABASE_URL to .env and restart the server.",
      };
    }
  }
  return { ok: false, error: fallback };
}

export async function analyzeQuestionnaireAction(): Promise<
  QuestionnaireActionResult<{ count: number }>
> {
  try {
    const session = await requireSession();
    const bank = await listBankQuestions();
    if (!bank.length) {
      return {
        ok: false,
        error:
          "No questions in the bank yet. Save an application with questions first.",
      };
    }

    const profile = await getUserProfile(session.userId);
    const resumeData = buildResumeProfileText(profile);
    if (!resumeData.trim()) {
      return {
        ok: false,
        error: "Add resume data in Profile before analyzing.",
      };
    }

    const answered = await analyzeQuestionnaire({
      questions: bank.map((item) => item.question),
      resumeData,
    });

    const byQuestion = new Map(
      bank.map((item) => [item.question.trim().toLowerCase(), item.id]),
    );

    const payload = answered
      .map((item) => {
        const questionId = byQuestion.get(item.question.trim().toLowerCase());
        if (!questionId) return null;
        return { questionId, answer: item.answer };
      })
      .filter((item): item is { questionId: string; answer: string } =>
        Boolean(item),
      );

    await upsertUserQuestionnaireAnswers(session.userId, payload);
    await syncQuestionnaireContextToProfile(session.userId);

    revalidatePath("/questionnaire");
    revalidatePath("/profile");
    return { ok: true, data: { count: payload.length } };
  } catch (error) {
    return fail(error, "Unable to analyze questionnaire. Please try again.");
  }
}

export async function updateQuestionnaireAnswerAction(input: unknown): Promise<
  QuestionnaireActionResult<{ id: string }>
> {
  try {
    const session = await requireSession();
    const data = z
      .object({
        id: z.string().uuid(),
        answer: z.string().trim().min(1, "Answer cannot be empty").max(20000),
      })
      .parse(input);

    const updated = await updateUserQuestionnaireAnswer(
      session.userId,
      data.id,
      data.answer,
    );
    if (!updated) {
      return { ok: false, error: "Questionnaire item not found." };
    }

    await syncQuestionnaireContextToProfile(session.userId);
    revalidatePath("/questionnaire");
    revalidatePath("/profile");
    return { ok: true, data: { id: updated.id } };
  } catch (error) {
    return fail(error, "Unable to save answer.");
  }
}

export async function removeQuestionnaireItemAction(input: unknown): Promise<
  QuestionnaireActionResult<{ id: string }>
> {
  try {
    const session = await requireSession();
    const data = z.object({ id: z.string().uuid() }).parse(input);
    const deleted = await deleteUserQuestionnaireItem(
      session.userId,
      data.id,
    );
    if (!deleted) {
      return { ok: false, error: "Questionnaire item not found." };
    }

    await syncQuestionnaireContextToProfile(session.userId);
    revalidatePath("/questionnaire");
    revalidatePath("/profile");
    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return fail(error, "Unable to remove question.");
  }
}

export async function getQuestionnairePageData(userId: string) {
  const dedupe = await dedupeSimilarQuestionsInBank();
  for (const id of dedupe.affectedUserIds) {
    await syncQuestionnaireContextToProfile(id);
  }

  const [items, bankCount] = await Promise.all([
    listUserQuestionnaire(userId),
    listBankQuestions().then((rows) => rows.length),
  ]);
  return { items, bankCount };
}
