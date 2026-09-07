import { ApplicationFilters } from "@/components/applications/application-filters";

export function DashboardHeader() {
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-xl font-medium tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pipeline health, response rates, and outcomes across your search.
        </p>
      </div>
      <ApplicationFilters showSearch={false} />
    </div>
  );
}
