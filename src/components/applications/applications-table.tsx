import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/applications/status-badge";
import { DeleteApplicationButton } from "@/components/applications/delete-application-button";
import { formatDate, formatRelative, formatSalary } from "@/lib/format";
import type { SerializedApplication } from "@/db/queries/applications";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ApplicationsTable({
  items,
  total,
  page,
  pageSize,
  query,
}: {
  items: SerializedApplication[];
  total: number;
  page: number;
  pageSize: number;
  query?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const params = new URLSearchParams(query);
  params.delete("page");
  const base = params.toString();

  function pageHref(next: number) {
    const prefix = base ? `${base}&` : "";
    return `?${prefix}page=${next}`;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-6 py-16 text-center">
        <p className="text-sm font-medium">No applications yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a job description to start tracking your search.
        </p>
        <Link
          href="/applications/new"
          className={cn(buttonVariants({ size: "sm" }), "mt-4")}
        >
          Add application
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Salary</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Last activity</TableHead>
            <TableHead>Ghosted</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  href={`/applications/${item.id}`}
                  className="font-medium hover:underline"
                >
                  {item.company}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/applications/${item.id}`}>{item.position}</Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.location ?? "—"}
              </TableCell>
              <TableCell>
                {formatSalary({
                  min: item.salaryMin,
                  max: item.salaryMax,
                  currency: item.salaryCurrency,
                  period: item.salaryPeriod,
                })}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell>{formatDate(item.appliedAt)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatRelative(item.lastActivityAt)}
              </TableCell>
              <TableCell>
                {item.isGhosted ? (
                  <Badge
                    variant="outline"
                    className="text-amber-700 dark:text-amber-300"
                  >
                    Ghosted
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.source ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <DeleteApplicationButton
                  applicationId={item.id}
                  company={item.company}
                  position={item.position}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pageCount > 1 ? (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            {total} applications · page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Previous
              </Link>
            ) : null}
            {page < pageCount ? (
              <Link
                href={pageHref(page + 1)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
