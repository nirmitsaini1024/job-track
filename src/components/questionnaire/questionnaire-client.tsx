"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import {
  analyzeQuestionnaireAction,
  removeQuestionnaireItemAction,
  updateQuestionnaireAnswerAction,
} from "@/actions/questionnaire";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type QuestionnaireItemView = {
  id: string;
  questionId: string;
  question: string;
  answer: string;
  updatedAt: string;
};

export function QuestionnaireClient({
  initialItems,
  bankCount,
}: {
  initialItems: QuestionnaireItemView[];
  bankCount: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialItems.map((item) => [item.id, item.answer])),
  );

  async function analyze() {
    setAnalyzing(true);
    const result = await analyzeQuestionnaireAction();
    setAnalyzing(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Analyzed ${result.data.count} questions`);
    window.location.reload();
  }

  async function saveAnswer(id: string) {
    const answer = (drafts[id] ?? "").trim();
    if (!answer) {
      toast.error("Answer cannot be empty");
      return;
    }
    setSavingId(id);
    const result = await updateQuestionnaireAnswerAction({ id, answer });
    setSavingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, answer } : item)),
    );
    toast.success("Answer saved to questionnaire + resume context");
  }

  async function removeItem(id: string) {
    setSavingId(id);
    const result = await removeQuestionnaireItemAction({ id });
    setSavingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    toast.success("Question removed");
  }

  async function copyAnswer(id: string) {
    const answer = (drafts[id] ?? "").trim();
    if (!answer) {
      toast.error("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(answer);
      toast.success("Answer copied");
    } catch {
      toast.error("Could not copy answer");
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-medium tracking-tight">Questionnaire</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared question bank grows when applications include new questions.
            Analyze drafts answers from your resume. Edit to save into your
            resume context.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Bank size: {bankCount} · Your items: {items.length}
          </p>
        </div>
        <Button onClick={analyze} disabled={analyzing || bankCount === 0}>
          {analyzing ? "Analyzing…" : "Analyze with AI"}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          {bankCount === 0
            ? "No questions yet. Save an application that has narrative questions, then come back and analyze."
            : "Question bank has entries, but you have no personal answers yet. Click Analyze with AI."}
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <div key={item.id} className="grid gap-3 rounded-xl border p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Question {index + 1}
                </p>
                <p className="mt-1 text-sm font-medium leading-6">
                  {item.question}
                </p>
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Answer
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    onClick={() => copyAnswer(item.id)}
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  rows={5}
                  value={drafts[item.id] ?? ""}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={savingId === item.id}
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingId === item.id}
                  onClick={() => saveAnswer(item.id)}
                >
                  {savingId === item.id ? "Saving…" : "Save answer"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
