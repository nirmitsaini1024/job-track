import { Badge } from "@/components/ui/badge";
import { formatPercent } from "@/lib/format";

export function AiResult({
  title,
  classification,
  confidence,
  summary,
  reasoning,
  children,
}: {
  title: string;
  classification: string;
  confidence: number;
  summary: string;
  reasoning: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-xl border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{title}</p>
        <Badge>{classification}</Badge>
        <span className="text-sm text-muted-foreground">
          Confidence: {formatPercent(confidence)}
        </span>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Summary</p>
        <p className="mt-1 text-sm">{summary}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Reasoning</p>
        <p className="mt-1 text-sm text-muted-foreground">{reasoning}</p>
      </div>
      {children}
    </div>
  );
}
