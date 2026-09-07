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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
};

function toReview(data: JobExtraction, extras: { url: string; source: string }): ReviewState {
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
  };
}

const selectClass = nativeSelectClassName;

export function JobAnalyzer() {
  const router = useRouter();
  const [mode, setMode] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [skillDraft, setSkillDraft] = useState("");

  const canAnalyze = useMemo(() => {
    if (mode === "text") return text.trim().length > 0;
    return Boolean(file);
  }, [mode, text, file]);

  function onFile(next: File | null) {
    if (!next) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(next.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      toast.error("Upload a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (next.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }
    setFile(next);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(next);
  }

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("text", text);
      form.set("source", source);
      form.set("applicationUrl", applicationUrl);
      if (file) form.set("image", file);

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
      setReview(toReview(payload.data as JobExtraction, { url: applicationUrl, source }));
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

  async function save() {
    if (!review) return;
    if (!review.company.trim() || !review.position.trim()) {
      toast.error("Company and position are required.");
      return;
    }
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
          <h1 className="text-xl font-medium tracking-tight">Review extracted details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Correct anything the AI missed, then save.
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
          Paste a job description or upload a screenshot. AI extracts the details for review.
        </p>
      </div>
      <Tabs value={mode} onValueChange={(value) => setMode(value as "text" | "image")}>
        <TabsList>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="image">Image</TabsTrigger>
        </TabsList>
        <TabsContent value="text">
          <Textarea
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste job description..."
          />
        </TabsContent>
        <TabsContent value="image" className="grid gap-3">
          <Input
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Job description preview"
              className="max-h-80 rounded-lg border object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              JPEG, PNG, WebP, or GIF · max 5MB
            </p>
          )}
        </TabsContent>
      </Tabs>
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
