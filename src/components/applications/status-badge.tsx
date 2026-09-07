import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";
import type { ApplicationStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const STYLES: Record<ApplicationStatus, string> = {
  SAVED: "border-border bg-muted text-muted-foreground",
  APPLIED: "border-transparent bg-sky-500/10 text-sky-700 dark:text-sky-300",
  SCREENING:
    "border-transparent bg-violet-500/10 text-violet-700 dark:text-violet-300",
  INTERVIEW:
    "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-300",
  OFFER: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REJECTED: "border-transparent bg-red-500/10 text-red-700 dark:text-red-300",
  WITHDRAWN: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
