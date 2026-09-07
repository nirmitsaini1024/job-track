"use client";

import { useState } from "react";
import { toast } from "sonner";
import { applyEmailAnalysisAction } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiResult } from "@/components/ai/ai-result";
import type { EmailAnalysis } from "@/lib/ai";
import { CLASSIFICATION_TO_STATUS, STATUS_LABELS } from "@/lib/constants";

export function EmailAnalyzer({ applicationId }: { applicationId: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  async function analyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/ai/analyze-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to analyze this email.");
      }
      setResult(payload.data as EmailAnalysis);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to analyze this email. Please try again or update the status manually.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function apply(applyStatus: boolean) {
    if (!result) return;
    setApplying(true);
    const saved = await applyEmailAnalysisAction({
      applicationId,
      content,
      classification: result.classification,
      confidence: result.confidence,
      summary: result.summary,
      reasoning: result.reasoning,
      applyStatus,
    });
    setApplying(false);
    if (!saved.ok) {
      toast.error(saved.error);
      return;
    }
    toast.success(
      applyStatus && result.classification !== "OTHER"
        ? `Saved and updated status to ${STATUS_LABELS[CLASSIFICATION_TO_STATUS[result.classification]]}`
        : "Response saved",
    );
    setResult(null);
    setContent("");
  }

  return (
    <div className="grid gap-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste recruiter or company email…"
        rows={8}
      />
      <div className="flex justify-end">
        <Button onClick={analyze} disabled={loading || !content.trim()}>
          {loading ? "Analyzing…" : "Analyze response"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <AiResult
          title="AI detected"
          classification={result.classification}
          confidence={result.confidence}
          summary={result.summary}
          reasoning={result.reasoning}
        >
          <div className="flex flex-wrap gap-2">
            {result.classification !== "OTHER" ? (
              <Button onClick={() => apply(true)} disabled={applying}>
                Apply status change
              </Button>
            ) : (
              <Button onClick={() => apply(false)} disabled={applying}>
                Save without status change
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setResult(null)}
              disabled={applying}
            >
              Cancel
            </Button>
          </div>
        </AiResult>
      ) : null}
    </div>
  );
}
