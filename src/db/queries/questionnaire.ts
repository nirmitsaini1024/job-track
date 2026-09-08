import { and, asc, eq, inArray } from "drizzle-orm";
import {
  getDb,
  questionnaireQuestions,
  userQuestionnaireItems,
  userProfiles,
} from "@/db";
import {
  cleanQuestionWording,
  normalizeQuestionKey,
  pickCanonicalQuestion,
} from "@/lib/questionnaire";

export async function upsertQuestionsIntoBank(
  questions: Array<{ question: string; answer?: string }>,
) {
  const dedupe = await dedupeSimilarQuestionsInBank();
  for (const userId of dedupe.affectedUserIds) {
    await syncQuestionnaireContextToProfile(userId);
  }

  const db = getDb();
  const now = new Date();
  const inserted: Array<{ id: string; question: string; normalizedKey: string }> =
    [];

  for (const item of questions) {
    const question = cleanQuestionWording(item.question);
    if (!question) continue;
    const normalizedKey = normalizeQuestionKey(question);
    if (!normalizedKey) continue;

    const [existing] = await db
      .select()
      .from(questionnaireQuestions)
      .where(eq(questionnaireQuestions.normalizedKey, normalizedKey))
      .limit(1);

    if (existing) {
      const canonical = pickCanonicalQuestion(existing.question, question);
      if (canonical !== existing.question) {
        await db
          .update(questionnaireQuestions)
          .set({ question: canonical })
          .where(eq(questionnaireQuestions.id, existing.id));
      }
      inserted.push({
        id: existing.id,
        question: canonical,
        normalizedKey: existing.normalizedKey,
      });
      continue;
    }

    const [created] = await db
      .insert(questionnaireQuestions)
      .values({
        question,
        normalizedKey,
        createdAt: now,
      })
      .returning();

    inserted.push({
      id: created.id,
      question: created.question,
      normalizedKey: created.normalizedKey,
    });
  }

  return inserted;
}

/**
 * Merge bank questions that normalize to the same key.
 * Keeps the richest wording and best user answers.
 */
export async function dedupeSimilarQuestionsInBank() {
  const db = getDb();
  const all = await db.select().from(questionnaireQuestions);
  if (all.length === 0) return { merged: 0, affectedUserIds: [] as string[] };

  const groups = new Map<string, typeof all>();
  for (const row of all) {
    const key = normalizeQuestionKey(row.question);
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  let merged = 0;
  const affectedUserIds = new Set<string>();

  // Merge duplicates first so unique keys are free before singleton key updates.
  for (const [key, group] of groups) {
    if (group.length < 2) continue;

    const canonicalText = pickCanonicalQuestion(
      ...group.map((row) => row.question),
    );
    const keeper =
      group.find((row) => cleanQuestionWording(row.question) === canonicalText) ??
      group[0];
    const duplicates = group.filter((row) => row.id !== keeper.id);

    for (const dup of duplicates) {
      const dupItems = await db
        .select()
        .from(userQuestionnaireItems)
        .where(eq(userQuestionnaireItems.questionId, dup.id));

      for (const item of dupItems) {
        affectedUserIds.add(item.userId);
        const [existingKeeperItem] = await db
          .select()
          .from(userQuestionnaireItems)
          .where(
            and(
              eq(userQuestionnaireItems.userId, item.userId),
              eq(userQuestionnaireItems.questionId, keeper.id),
            ),
          )
          .limit(1);

        const preferDup =
          item.answer.trim().length >
          (existingKeeperItem?.answer.trim().length ?? 0);

        if (existingKeeperItem) {
          if (preferDup) {
            await db
              .update(userQuestionnaireItems)
              .set({
                answer: item.answer,
                updatedAt: new Date(),
              })
              .where(eq(userQuestionnaireItems.id, existingKeeperItem.id));
          }
          await db
            .delete(userQuestionnaireItems)
            .where(eq(userQuestionnaireItems.id, item.id));
        } else {
          await db
            .update(userQuestionnaireItems)
            .set({ questionId: keeper.id, updatedAt: new Date() })
            .where(eq(userQuestionnaireItems.id, item.id));
        }
      }

      await db
        .delete(questionnaireQuestions)
        .where(eq(questionnaireQuestions.id, dup.id));
      merged += 1;
    }

    await db
      .update(questionnaireQuestions)
      .set({
        question: canonicalText,
        normalizedKey: key,
      })
      .where(eq(questionnaireQuestions.id, keeper.id));
  }

  for (const [key, group] of groups) {
    if (group.length !== 1) continue;
    const only = group[0];
    if (!only) continue;
    const cleaned = cleanQuestionWording(only.question);
    if (only.normalizedKey !== key || cleaned !== only.question) {
      await db
        .update(questionnaireQuestions)
        .set({ normalizedKey: key, question: cleaned || only.question })
        .where(eq(questionnaireQuestions.id, only.id));
    }
  }

  return { merged, affectedUserIds: [...affectedUserIds] };
}

export async function listBankQuestions() {
  const db = getDb();
  return db
    .select()
    .from(questionnaireQuestions)
    .orderBy(asc(questionnaireQuestions.createdAt));
}

export async function listUserQuestionnaire(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: userQuestionnaireItems.id,
      answer: userQuestionnaireItems.answer,
      updatedAt: userQuestionnaireItems.updatedAt,
      questionId: questionnaireQuestions.id,
      question: questionnaireQuestions.question,
    })
    .from(userQuestionnaireItems)
    .innerJoin(
      questionnaireQuestions,
      eq(userQuestionnaireItems.questionId, questionnaireQuestions.id),
    )
    .where(eq(userQuestionnaireItems.userId, userId))
    .orderBy(asc(userQuestionnaireItems.createdAt));

  return rows;
}

export async function upsertUserQuestionnaireAnswers(
  userId: string,
  items: Array<{ questionId: string; answer: string }>,
) {
  const db = getDb();
  const now = new Date();
  const results = [];

  for (const item of items) {
    const [existing] = await db
      .select()
      .from(userQuestionnaireItems)
      .where(
        and(
          eq(userQuestionnaireItems.userId, userId),
          eq(userQuestionnaireItems.questionId, item.questionId),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(userQuestionnaireItems)
        .set({ answer: item.answer, updatedAt: now })
        .where(eq(userQuestionnaireItems.id, existing.id))
        .returning();
      results.push(updated);
      continue;
    }

    const [created] = await db
      .insert(userQuestionnaireItems)
      .values({
        userId,
        questionId: item.questionId,
        answer: item.answer,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    results.push(created);
  }

  return results;
}

export async function updateUserQuestionnaireAnswer(
  userId: string,
  itemId: string,
  answer: string,
) {
  const db = getDb();
  const [updated] = await db
    .update(userQuestionnaireItems)
    .set({ answer, updatedAt: new Date() })
    .where(
      and(
        eq(userQuestionnaireItems.id, itemId),
        eq(userQuestionnaireItems.userId, userId),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function deleteUserQuestionnaireItem(
  userId: string,
  itemId: string,
) {
  const db = getDb();
  const [deleted] = await db
    .delete(userQuestionnaireItems)
    .where(
      and(
        eq(userQuestionnaireItems.id, itemId),
        eq(userQuestionnaireItems.userId, userId),
      ),
    )
    .returning();
  return deleted ?? null;
}

export async function syncQuestionnaireContextToProfile(userId: string) {
  const items = await listUserQuestionnaire(userId);
  const context = items
    .filter((item) => item.answer.trim())
    .map((item) => ({
      question: item.question,
      answer: item.answer.trim(),
    }));

  const db = getDb();
  const now = new Date();
  const [existing] = await db
    .select({ id: userProfiles.id, resumeData: userProfiles.resumeData })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const contextBlock = formatQuestionnaireResumeSection(context);
  const nextResume = mergeQuestionnaireIntoResume(
    existing?.resumeData ?? "",
    contextBlock,
  );

  if (existing) {
    const [updated] = await db
      .update(userProfiles)
      .set({
        questionnaireContext: context,
        resumeData: nextResume,
        updatedAt: now,
      })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(userProfiles)
    .values({
      userId,
      questionnaireContext: context,
      resumeData: nextResume,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return created;
}

const QUESTIONNAIRE_SECTION_RE =
  /\n*##\s*Questionnaire answers[\s\S]*?(?=\n##\s|$)/i;

function formatQuestionnaireResumeSection(
  items: Array<{ question: string; answer: string }>,
) {
  if (!items.length) return "";
  const body = items
    .map((item) => `### ${item.question}\n${item.answer}`)
    .join("\n\n");
  return `## Questionnaire answers\n${body}`;
}

function mergeQuestionnaireIntoResume(resumeData: string, section: string) {
  const base = resumeData.replace(QUESTIONNAIRE_SECTION_RE, "").trimEnd();
  if (!section) return base;
  return base ? `${base}\n\n${section}` : section;
}

export async function getQuestionsByIds(ids: string[]) {
  if (!ids.length) return [];
  const db = getDb();
  return db
    .select()
    .from(questionnaireQuestions)
    .where(inArray(questionnaireQuestions.id, ids));
}
