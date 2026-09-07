import Link from "next/link";
import { StatusBadge } from "@/components/applications/status-badge";
import { formatSalary } from "@/lib/format";
import type { SerializedApplication } from "@/db/queries/applications";

export function ApplicationCard({ application }: { application: SerializedApplication }) {
  return (
    <Link
      href={`/applications/${application.id}`}
      className="block rounded-lg border bg-card p-4 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{application.company}</p>
          <p className="text-sm text-muted-foreground">{application.position}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {application.location ?? "—"} ·{" "}
        {formatSalary({
          min: application.salaryMin,
          max: application.salaryMax,
          currency: application.salaryCurrency,
          period: application.salaryPeriod,
        })}
      </p>
    </Link>
  );
}
