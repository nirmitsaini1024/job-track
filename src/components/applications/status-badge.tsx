import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";
import type { ApplicationStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const STYLES: Record<ApplicationStatus, string> = {
  SAVED:
    "border-border bg-muted text-muted-foreground",
  APPLIED:
    "border-sky-600/25 bg-sky-500/10 text-sky-800 dark:border-sky-400/30 dark:text-sky-200",
  SCREENING:
    "border-indigo-600/25 bg-indigo-500/10 text-indigo-800 dark:border-indigo-400/30 dark:text-indigo-200",
  INTERVIEW:
    "border-amber-600/25 bg-amber-500/10 text-amber-900 dark:border-amber-400/30 dark:text-amber-200",
  OFFER:
    "border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-200",
  REJECTED:
    "border-red-600/25 bg-red-500/10 text-red-800 dark:border-red-400/30 dark:text-red-200",
  WITHDRAWN:
    "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-md font-medium", STYLES[status], className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
