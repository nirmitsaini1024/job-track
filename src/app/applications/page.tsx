import { ApplicationsTable } from "@/components/applications/applications-table";
import { ApplicationFilters } from "@/components/applications/application-filters";
import { getApplications } from "@/db/queries/applications";
import { requireSession } from "@/lib/auth";
import { parseSearchParams } from "@/lib/validations/application";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const raw = await searchParams;
  const filters = parseSearchParams(raw);
  const query = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  ).toString();

  let result: Awaited<ReturnType<typeof getApplications>> | null = null;
  let error: string | null = null;
  try {
    result = await getApplications(filters, session.userId);
  } catch (err) {
    error =
      err instanceof Error && err.message.includes("DATABASE_URL")
        ? "Add DATABASE_URL to .env.local, then run npm run db:push."
        : "Unable to load applications.";
  }

  if (error || !result) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search, filter, and open any role in your pipeline.
        </p>
      </div>
      <ApplicationFilters />
      <ApplicationsTable
        items={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        query={query}
      />
    </div>
  );
}
