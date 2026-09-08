"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { updateApplicationDetailsAction } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function EditableApplicationFields({
  applicationId,
  company,
  applicationUrl,
  employmentType,
  description,
}: {
  applicationId: string;
  company: string;
  applicationUrl: string | null;
  employmentType: string | null;
  description: string;
}) {
  const [editing, setEditing] = useState(false);
  const [companyValue, setCompanyValue] = useState(company);
  const [urlValue, setUrlValue] = useState(applicationUrl ?? "");
  const [employmentValue, setEmploymentValue] = useState(employmentType ?? "");
  const [descriptionValue, setDescriptionValue] = useState(description);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCompanyValue(company);
    setUrlValue(applicationUrl ?? "");
    setEmploymentValue(employmentType ?? "");
    setDescriptionValue(description);
  }, [company, applicationUrl, employmentType, description]);

  function cancel() {
    setCompanyValue(company);
    setUrlValue(applicationUrl ?? "");
    setEmploymentValue(employmentType ?? "");
    setDescriptionValue(description);
    setEditing(false);
  }

  function save() {
    const nextCompany = companyValue.trim();
    if (!nextCompany) {
      toast.error("Company is required.");
      return;
    }

    const nextUrl = urlValue.trim();
    const nextEmployment = employmentValue.trim();
    if (
      nextCompany === company &&
      nextUrl === (applicationUrl ?? "") &&
      nextEmployment === (employmentType ?? "") &&
      descriptionValue === description
    ) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await updateApplicationDetailsAction({
        id: applicationId,
        company: nextCompany,
        applicationUrl: nextUrl || null,
        employmentType: nextEmployment || null,
        description: descriptionValue,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Application details updated");
      setEditing(false);
    });
  }

  return (
    <div className={cn("grid gap-4", pending && "opacity-70")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Details</p>
        {!editing ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 shrink-0 text-muted-foreground"
            aria-label="Edit details"
            title="Edit company, employment type, link, and description"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6"
              disabled={pending}
              aria-label="Save"
              title="Save"
              onClick={save}
            >
              <Check className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6"
              disabled={pending}
              aria-label="Cancel"
              title="Cancel"
              onClick={cancel}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-1">
        <p className="text-xs font-medium text-muted-foreground">Company</p>
        {editing ? (
          <Input
            value={companyValue}
            disabled={pending}
            autoFocus
            maxLength={200}
            placeholder="Company name"
            onChange={(event) => setCompanyValue(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") cancel();
            }}
          />
        ) : (
          <p className="text-sm">{company}</p>
        )}
      </div>

      <div className="grid gap-1">
        <p className="text-xs font-medium text-muted-foreground">
          Employment type
        </p>
        {editing ? (
          <Input
            value={employmentValue}
            disabled={pending}
            maxLength={100}
            placeholder="Full-time, Internship…"
            onChange={(event) => setEmploymentValue(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") cancel();
            }}
          />
        ) : (
          <p className="text-sm">{employmentType || "—"}</p>
        )}
      </div>

      <div className="grid gap-1">
        <p className="text-xs font-medium text-muted-foreground">
          Application URL
        </p>
        {editing ? (
          <Input
            type="url"
            value={urlValue}
            disabled={pending}
            maxLength={2000}
            placeholder="https://…"
            onChange={(event) => setUrlValue(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") cancel();
            }}
          />
        ) : applicationUrl ? (
          <a
            href={applicationUrl}
            className="break-all text-sm underline"
            target="_blank"
            rel="noreferrer"
          >
            {applicationUrl}
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">No link saved</p>
        )}
      </div>

      <div className="grid gap-1">
        <p className="text-xs font-medium text-muted-foreground">Description</p>
        {editing ? (
          <Textarea
            value={descriptionValue}
            disabled={pending}
            rows={8}
            maxLength={50000}
            placeholder="Job description…"
            onChange={(event) => setDescriptionValue(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") cancel();
            }}
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-6">
            {description || "No description saved."}
          </p>
        )}
      </div>
    </div>
  );
}
