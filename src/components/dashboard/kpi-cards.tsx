import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/format";
import type { DashboardStats } from "@/db/queries/dashboard";

export function KpiCards({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: "Total applications", value: String(stats.total) },
    { label: "Active", value: String(stats.active) },
    { label: "Rejected", value: String(stats.rejected) },
    { label: "Ghosted", value: String(stats.ghosted) },
    { label: "Interviews", value: String(stats.interviews) },
    { label: "Offers", value: String(stats.offers) },
    { label: "Response rate", value: formatPercent(stats.responseRate) },
    { label: "Interview rate", value: formatPercent(stats.interviewRate) },
    { label: "Offer rate", value: formatPercent(stats.offerRate) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-9">
      {items.map((item) => (
        <Card key={item.label} size="sm" className="rounded-lg">
          <CardHeader className="pb-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {item.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-medium tracking-tight">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
