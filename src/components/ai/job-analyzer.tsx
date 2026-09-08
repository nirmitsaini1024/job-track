"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createApplicationAction } from "@/actions/applications";
import type { JobExtraction } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  APPLICATION_STATUSES,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  REMOTE_TYPES,
  SALARY_PERIODS,
  STATUS_LABELS,
  REMOTE_LABELS,
} from "@/lib/constants";
import { nativeSelectClassName } from "@/lib/select-styles";

type QuestionAnswer = { question: string; answer: string };

type PastedImage = {
  id: string;
  file: File;
  preview: string;
};

type ReviewState = {
  company: string;
  position: string;
  location: string;
  remoteType: (typeof REMOTE_TYPES)[number];
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: (typeof SALARY_PERIODS)[number] | "";
  experienceMin: string;
  experienceMax: string;
  skills: string[];
  description: string;
  applicationUrl: string;
  source: string;
  status: (typeof APPLICATION_STATUSES)[number];
  questionAnswers: QuestionAnswer[];
};

function toReview(
  data: JobExtraction,
  extras: { url: string; source: string },
): ReviewState {
  return {
    company: data.company ?? "",
    position: data.position ?? "",
    location: data.location ?? "",
    remoteType: data.remoteType,
    employmentType: data.employmentType ?? "",
    salaryMin: data.salary?.min != null ? String(data.salary.min) : "",
    salaryMax: data.salary?.max != null ? String(data.salary.max) : "",
    salaryCurrency: data.salary?.currency ?? "",
    salaryPeriod: data.salary?.period ?? "",
    experienceMin: data.experience?.min != null ? String(data.experience.min) : "",
    experienceMax: data.experience?.max != null ? String(data.experience.max) : "",
    skills: data.skills,
    description: data.description,
    applicationUrl: data.applicationUrl ?? extras.url,
    source: data.source ?? extras.source,
    status: "SAVED",
    questionAnswers: data.questions ?? [],
  };
}

const selectClass = nativeSelectClassName;

async function fileFromClipboardItem(item: DataTransferItem): Promise<File | null> {
  if (!item.type.startsWith("image/")) return null;
  const file = item.getAsFile();
  return file;
}

function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Use JPEG, PNG, WebP, or GIF images.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Each image must be 5MB or smaller.";
  }
  return null;
}

export function JobAnalyzer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [images, setImages] = useState<PastedImage[]>([]);
  const [source, setSource] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [skillDraft, setSkillDraft] = useState("");

  const canAnalyze = useMemo(
    () => text.trim().length > 0 || images.length > 0,
    [text, images],
  );

  function addFiles(files: File[]) {
    const next: PastedImage[] = [];
    for (const file of files) {
      const validationError = validateImage(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (next.length) {
      setImages((current) => [...current, ...next]);
    }
  }

  function removeImage(id: string) {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((image) => image.id !== id);
    });
  }

  async function onPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(event.clipboardData.items);
    const imageFiles: File[] = [];

    for (const item of items) {
      const file = await fileFromClipboardItem(item);
      if (file) imageFiles.push(file);
    }

    if (imageFiles.length) {
      event.preventDefault();
      const pastedText = event.clipboardData.getData("text");
      if (pastedText) {
        setText((current) => (current ? `${current}\n${pastedText}` : pastedText));
      }
      addFiles(imageFiles);
      toast.success(
        imageFiles.length === 1
          ? "Image pasted"
          : `${imageFiles.length} images pasted`,
      );
    }
  }

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("text", text);
      form.set("source", source);
      form.set("applicationUrl", applicationUrl);
      for (const image of images) {
        form.append("images", image.file);
      }

      const response = await fetch("/api/ai/analyze-job", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          payload.error ??
            "Unable to analyze this job. Please try again or enter the details manually.",
        );
      }
      setReview(
        toReview(payload.data as JobExtraction, {
          url: applicationUrl,
          source,
        }),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to analyze this job. Please try again or enter the details manually.";
      setError(message);
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  }

  function addSkill() {
    const value = skillDraft.trim();
    if (!value || !review) return;
    if (!review.skills.includes(value)) {
      setReview({ ...review, skills: [...review.skills, value] });
    }
    setSkillDraft("");
  }

  function updateQuestion(index: number, patch: Partial<QuestionAnswer>) {
    if (!review) return;
    setReview({
      ...review,
      questionAnswers: review.questionAnswers.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    });
  }

  function removeQuestion(index: number) {
    if (!review) return;
    setReview({
      ...review,
      questionAnswers: review.questionAnswers.filter((_, i) => i !== index),
    });
  }

  function addQuestion() {
    if (!review) return;
    setReview({
      ...review,
      questionAnswers: [
        ...review.questionAnswers,
        { question: "", answer: "" },
      ],
    });
  }

  async function save() {
    if (!review) return;
    if (!review.company.trim() || !review.position.trim()) {
      toast.error("Company and position are required.");
      return;
    }
    const questionAnswers = review.questionAnswers
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question && item.answer);

    setSaving(true);
    const result = await createApplicationAction({
      company: review.company,
      position: review.position,
      location: review.location || null,
      remoteType: review.remoteType,
      employmentType: review.employmentType || null,
      salaryMin: toOptionalNumber(review.salaryMin),
      salaryMax: toOptionalNumber(review.salaryMax),
      salaryCurrency: review.salaryCurrency || null,
      salaryPeriod: review.salaryPeriod || null,
      experienceMin: toOptionalNumber(review.experienceMin),
      experienceMax: toOptionalNumber(review.experienceMax),
      description: review.description,
      applicationUrl: review.applicationUrl || null,
      source: review.source || null,
      status: review.status,
      skills: review.skills,
      questionAnswers,
    });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Application saved");
    router.push(`/applications/${result.data.id}`);
  }

  if (review) {
    return (
      <div className="grid gap-6">
        <div>
          <h1 className="text-xl font-medium tracking-tight">
            Review extracted details
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Correct anything the AI missed, then save. Question answers are based
            on your profile resume data.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company">
            <Input
              value={review.company}
              onChange={(e) => setReview({ ...review, company: e.target.value })}
            />
          </Field>
          <Field label="Position">
            <Input
              value={review.position}
              onChange={(e) => setReview({ ...review, position: e.target.value })}
            />
          </Field>
          <Field label="Location">
            <Input
              value={review.location}
              onChange={(e) => setReview({ ...review, location: e.target.value })}
            />
          </Field>
          <Field label="Remote type">
            <select
              className={selectClass}
              value={review.remoteType}
              onChange={(e) =>
                setReview({
                  ...review,
                  remoteType: e.target.value as ReviewState["remoteType"],
                })
              }
            >
              {REMOTE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {REMOTE_LABELS[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Employment type">
            <Input
              value={review.employmentType}
              onChange={(e) =>
                setReview({ ...review, employmentType: e.target.value })
              }
            />
          </Field>
          <Field label="Status">
            <select
              className={selectClass}
              value={review.status}
              onChange={(e) =>
                setReview({
                  ...review,
                  status: e.target.value as ReviewState["status"],
                })
              }
            >
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Salary min">
            <Input
              type="number"
              value={review.salaryMin}
              onChange={(e) => setReview({ ...review, salaryMin: e.target.value })}
            />
          </Field>
          <Field label="Salary max">
            <Input
              type="number"
              value={review.salaryMax}
              onChange={(e) => setReview({ ...review, salaryMax: e.target.value })}
            />
          </Field>
          <Field label="Currency">
            <Input
              value={review.salaryCurrency}
              placeholder="INR, USD…"
              onChange={(e) =>
                setReview({ ...review, salaryCurrency: e.target.value })
              }
            />
          </Field>
          <Field label="Salary period">
            <select
              className={selectClass}
              value={review.salaryPeriod}
              onChange={(e) =>
                setReview({
                  ...review,
                  salaryPeriod: e.target.value as ReviewState["salaryPeriod"],
                })
              }
            >
              <option value="">None</option>
              {SALARY_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Experience min (years)">
            <Input
              type="number"
              value={review.experienceMin}
              onChange={(e) =>
                setReview({ ...review, experienceMin: e.target.value })
              }
            />
          </Field>
          <Field label="Experience max (years)">
            <Input
              type="number"
              value={review.experienceMax}
              onChange={(e) =>
                setReview({ ...review, experienceMax: e.target.value })
              }
            />
          </Field>
          <Field label="Job URL">
            <Input
              value={review.applicationUrl}
              onChange={(e) =>
                setReview({ ...review, applicationUrl: e.target.value })
              }
            />
          </Field>
          <Field label="Source">
            <Input
              value={review.source}
              onChange={(e) => setReview({ ...review, source: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Skills">
          <div className="flex flex-wrap gap-1.5">
            {review.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1">
                {skill}
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setReview({
                      ...review,
                      skills: review.skills.filter((item) => item !== skill),
                    })
                  }
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={skillDraft}
              placeholder="Add skill"
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addSkill}>
              Add
            </Button>
          </div>
        </Field>
        <Field label="Description">
          <Textarea
            rows={10}
            value={review.description}
            onChange={(e) => setReview({ ...review, description: e.target.value })}
          />
        </Field>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Questions & answers</h2>
              <p className="text-sm text-muted-foreground">
                Drafted from your Complete resume data. Edit before saving.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
              Add question
            </Button>
          </div>
          {review.questionAnswers.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No application questions were found in the job post.
            </p>
          ) : (
            <div className="grid gap-4">
              {review.questionAnswers.map((item, index) => (
                <div key={index} className="grid gap-2 rounded-lg border p-4">
                  <Field label={`Question ${index + 1}`}>
                    <Textarea
                      rows={2}
                      value={item.question}
                      onChange={(e) =>
                        updateQuestion(index, { question: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Answer">
                    <Textarea
                      rows={4}
                      value={item.answer}
                      onChange={(e) =>
                        updateQuestion(index, { answer: e.target.value })
                      }
                    />
                  </Field>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setReview(null)} disabled={saving}>
            Back
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save application"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Add application</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste the job description AND any application form questions (or
          screenshots of the form). AI extracts the role and drafts answers from
          your profile resume.
        </p>
      </div>

      <div className="grid gap-3">
        <Field label="Job description & questions">
          <Textarea
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={onPaste}
            placeholder="Paste job description here. If the application has essay questions (hardest project, inspiration, pitch, etc.), paste those too — or paste screenshots of the form (Ctrl/Cmd+V)."
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            multiple
            className="max-w-xs"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <p className="text-sm text-muted-foreground">
            Or paste images into the box · JPEG/PNG/WebP/GIF · max 5MB each
          </p>
        </div>

        {images.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((image) => (
              <div key={image.id} className="relative overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.preview}
                  alt="Pasted job content"
                  className="max-h-56 w-full object-contain bg-muted/30"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => removeImage(image.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job URL (optional)">
          <Input
            value={applicationUrl}
            onChange={(e) => setApplicationUrl(e.target.value)}
            placeholder="https://"
          />
        </Field>
        <Field label="Source (optional)">
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="LinkedIn, company site, referral…"
          />
        </Field>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button onClick={analyze} disabled={!canAnalyze || analyzing}>
          {analyzing ? "Analyzing with AI…" : "Analyze with AI"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function toOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}
