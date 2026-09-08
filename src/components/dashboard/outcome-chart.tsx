"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tick = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--popover-foreground)",
  fontSize: 12,
};

const OUTCOME_COLORS: Record<string, string> = {
  Active: "#0ea5e9",
  Ghosted: "#d97706",
  Screening: "#6366f1",
  Interview: "#f59e0b",
  Offer: "#10b981",
  Rejected: "#ef4444",
};

const FALLBACK_COLOR = "var(--chart-1)";

export function OutcomeChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Outcomes</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
            <YAxis
              allowDecimals={false}
              tick={tick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={OUTCOME_COLORS[entry.name] ?? FALLBACK_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
