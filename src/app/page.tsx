import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ApplicationChart } from "@/components/dashboard/application-chart";
import { ApplicationFunnel } from "@/components/dashboard/application-funnel";
import { OutcomeChart } from "@/components/dashboard/outcome-chart";
import { PositionPerformance } from "@/components/dashboard/position-performance";
import { getApplicationAnalytics } from "@/db/queries/dashboard";
import { parseSearchParams } from "@/lib/validations/application";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const filters = parseSearchParams(await searchParams);

  let analytics: Awaited<ReturnType<typeof getApplicationAnalytics>> | null = null;
  let error: string | null = null;

  try {
    analytics = await getApplicationAnalytics(filters);
  } catch (err) {
    error =
      err instanceof Error && err.message.includes("DATABASE_URL")
        ? "Add DATABASE_URL to .env.local, then run npm run db:push."
        : "Unable to load dashboard data.";
  }

  return (
    <div className="grid gap-6">
      <DashboardHeader />
      {error || !analytics ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          {error}
        </div>
      ) : (
        <>
          <KpiCards stats={analytics} />
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <ApplicationChart data={analytics.volume} />
            <ApplicationFunnel data={analytics.funnel} />
          </div>
          <OutcomeChart data={analytics.outcomes} />
          <PositionPerformance
            byPosition={analytics.byPosition}
            bySource={analytics.bySource}
          />
        </>
      )}
    </div>
  );
}
