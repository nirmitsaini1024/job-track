"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  convertRecommendationAction,
  dismissRecommendationAction,
} from "@/actions/recommendations";
import type { SerializedRecommendation } from "@/db/queries/recommendations";
import { formatDate, formatSalary } from "@/lib/format";
import { REMOTE_LABELS } from "@/lib/constants";
import type { RemoteType } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecommendationsFeed({
  items,
}: {
  items: SerializedRecommendation[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function dismiss(id: string) {
    startTransition(async () => {
      const result = await dismissRecommendationAction({ id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Removed from your recommendations");
      router.refresh();
    });
  }

  function convert(id: string, status: "SAVED" | "APPLIED") {
    startTransition(async () => {
      const result = await convertRecommendationAction({ id, status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        status === "APPLIED"
          ? "Saved as applied"
          : "Saved to your applications",
      );
      router.push(`/applications/${result.data.applicationId}`);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-6 py-16 text-center">
        <p className="text-sm font-medium">No recommendations yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          When someone recommends a job to you, it shows up here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  From @{item.fromUsername}
                </p>
                <CardTitle className="text-lg">
                  {item.company && item.company !== "Unknown"
                    ? `${item.position} at ${item.company}`
                    : item.position}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{formatDate(item.createdAt)}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 text-muted-foreground"
                  disabled={pending}
                  aria-label="Remove recommendation"
                  title="Remove from recommendations"
                  onClick={() => dismiss(item.id)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{item.location ?? "Location unknown"}</span>
              <span>·</span>
              <span>
                {REMOTE_LABELS[item.remoteType as RemoteType] ?? "Unknown"}
              </span>
              <span>·</span>
              <span>
                {formatSalary({
                  min: item.salaryMin,
                  max: item.salaryMax,
                  currency: item.salaryCurrency,
                  period: item.salaryPeriod,
                })}
              </span>
            </div>
            {item.employmentType ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Employment: </span>
                {item.employmentType}
              </p>
            ) : null}
            <a
              href={item.applicationUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm underline"
            >
              {item.applicationUrl}
            </a>
            {item.note ? (
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Note</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                  {item.note}
                </p>
              </div>
            ) : null}
            {item.description ? (
              <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            ) : null}
            {item.skills.length ? (
              <div className="flex flex-wrap gap-1.5">
                {item.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => convert(item.id, "SAVED")}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => convert(item.id, "APPLIED")}
              >
                Mark applied
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => dismiss(item.id)}
              >
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
