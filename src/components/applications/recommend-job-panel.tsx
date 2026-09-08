"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  listRecommendableUsersAction,
  recommendJobAction,
} from "@/actions/recommendations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RecommendJobPanel({
  applicationId,
  applicationUrl,
}: {
  applicationId: string;
  applicationUrl: string | null;
}) {
  const [users, setUsers] = useState<Array<{ id: string; username: string }>>(
    [],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [pending, startTransition] = useTransition();
  const hasUrl = Boolean(applicationUrl?.trim());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await listRecommendableUsersAction();
      if (cancelled) return;
      if (!result.ok) {
        toast.error(result.error);
        setLoadingUsers(false);
        return;
      }
      setUsers(result.data);
      setLoadingUsers(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(userId: string) {
    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  function recommend() {
    if (!hasUrl) {
      toast.error("Add a job URL before recommending.");
      return;
    }
    if (!selected.length) {
      toast.error("Select at least one person.");
      return;
    }

    startTransition(async () => {
      const result = await recommendJobAction({
        applicationId,
        toUserIds: selected,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const names = result.data.usernames.map((name) => `@${name}`).join(", ");
      if (result.data.skipped.length) {
        toast.success(
          `Recommended to ${names}. Already pending for: ${result.data.skipped
            .map((name) => `@${name}`)
            .join(", ")}`,
        );
      } else {
        toast.success(`Recommended to ${names}`);
      }
      setSelected([]);
    });
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-medium">Recommend this job</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Multi-select people by username. A job URL is required.
        </p>
      </div>

      {!hasUrl ? (
        <p className="rounded-md border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
          Add an application URL in Details before you can recommend this job.
        </p>
      ) : null}

      {loadingUsers ? (
        <p className="text-sm text-muted-foreground">Loading people…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No other users to recommend to yet.
        </p>
      ) : (
        <div
          className={cn(
            "max-h-48 space-y-1 overflow-y-auto rounded-md border p-2",
            !hasUrl && "pointer-events-none opacity-50",
          )}
        >
          {users.map((user) => {
            const checked = selected.includes(user.id);
            return (
              <label
                key={user.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60",
                  checked && "bg-muted",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked}
                  disabled={pending || !hasUrl}
                  onChange={() => toggle(user.id)}
                />
                <span>@{user.username}</span>
              </label>
            );
          })}
        </div>
      )}

      {selected.length ? (
        <p className="text-xs text-muted-foreground">
          Selected:{" "}
          {selected
            .map((id) => users.find((user) => user.id === id)?.username)
            .filter(Boolean)
            .map((name) => `@${name}`)
            .join(", ")}
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        disabled={pending || !hasUrl || !selected.length}
        onClick={recommend}
      >
        {pending
          ? "Sending…"
          : selected.length
            ? `Recommend to ${selected.length}`
            : "Recommend"}
      </Button>
    </div>
  );
}
