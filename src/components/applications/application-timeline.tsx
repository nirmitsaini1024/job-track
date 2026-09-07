import { format } from "date-fns";
import type { EventType } from "@/db/schema";

const LABELS: Record<EventType, string> = {
  APPLICATION_CREATED: "Created",
  STATUS_CHANGED: "Status changed",
  EMAIL_RECEIVED: "Email received",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTION: "Rejection",
  NOTE_ADDED: "Note",
};

export function ApplicationTimeline({
  events,
}: {
  events: {
    id: string;
    type: EventType;
    description: string;
    createdAt: string;
  }[];
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No timeline events yet.</p>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <ol className="space-y-4">
      {sorted.map((event) => (
        <li key={event.id} className="grid grid-cols-[88px_1fr] gap-4">
          <div className="pt-0.5 text-xs text-muted-foreground">
            {format(new Date(event.createdAt), "MMM d")}
          </div>
          <div className="border-l pl-4">
            <p className="text-sm font-medium">{LABELS[event.type]}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
              {event.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
