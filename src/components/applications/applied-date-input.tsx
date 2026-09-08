"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateApplicationAppliedAtAction } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatDate,
  parseAppliedDateInput,
  toAppliedDateInputValue,
} from "@/lib/format";
import { cn } from "@/lib/utils";

function toDate(appliedAt: string | null): Date | undefined {
  const iso = toAppliedDateInputValue(appliedAt);
  if (!iso) return undefined;
  return parseAppliedDateInput(iso) ?? undefined;
}

export function AppliedDateInput({
  applicationId,
  appliedAt,
  className,
  compact = false,
}: {
  applicationId: string;
  appliedAt: string | null;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const selected = toDate(appliedAt);

  function save(next: string | null) {
    const previous = toAppliedDateInputValue(appliedAt);
    if ((next ?? "") === previous) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await updateApplicationAppliedAtAction({
        id: applicationId,
        appliedAt: next,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Applied date updated" : "Applied date cleared");
      setOpen(false);
    });
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span
        className={cn(
          "min-w-0 truncate text-foreground",
          compact ? "text-xs leading-5" : "text-sm",
        )}
      >
        {formatDate(appliedAt)}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 shrink-0 text-muted-foreground"
              aria-label="Edit applied date"
              title="Edit applied date"
              disabled={pending}
            />
          }
        >
          <Pencil className="size-3.5" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-auto p-2"
        >
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            disabled={pending}
            onSelect={(date) => {
              if (!date) return;
              save(toAppliedDateInputValue(date));
            }}
          />
          <div className="flex items-center justify-between gap-2 border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || !appliedAt}
              onClick={() => save(null)}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
