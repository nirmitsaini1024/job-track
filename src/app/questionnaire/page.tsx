import { QuestionnaireClient } from "@/components/questionnaire/questionnaire-client";
import { getQuestionnairePageData } from "@/actions/questionnaire";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage() {
  const session = await requireSession();
  const { items, bankCount } = await getQuestionnairePageData(session.userId);

  return (
    <QuestionnaireClient
      bankCount={bankCount}
      initialItems={items.map((item) => ({
        id: item.id,
        questionId: item.questionId,
        question: item.question,
        answer: item.answer,
        updatedAt: item.updatedAt.toISOString(),
      }))
      }
    />
  );
}
