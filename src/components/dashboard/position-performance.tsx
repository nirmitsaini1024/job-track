import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPercent } from "@/lib/format";

export function PositionPerformance({
  byPosition,
}: {
  byPosition: {
    position: string;
    applied: number;
    responses: number;
    responseRate: number;
    interviews: number;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications by position</CardTitle>
      </CardHeader>
      <CardContent>
        {byPosition.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Responses</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Interviews</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byPosition.slice(0, 8).map((row) => (
                <TableRow key={row.position}>
                  <TableCell className="font-medium">{row.position}</TableCell>
                  <TableCell>{row.applied}</TableCell>
                  <TableCell>{row.responses}</TableCell>
                  <TableCell>{formatPercent(row.responseRate)}</TableCell>
                  <TableCell>{row.interviews}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
