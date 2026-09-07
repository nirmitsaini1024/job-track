import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ApplicationFunnel({
  data,
}: {
  data: { stage: string; count: number }[];
}) {
  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Funnel</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {data.map((item) => (
          <div key={item.stage} className="grid gap-1">
            <div className="flex items-center justify-between text-sm">
              <span>{item.stage}</span>
              <span className="text-muted-foreground">{item.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground/80"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
