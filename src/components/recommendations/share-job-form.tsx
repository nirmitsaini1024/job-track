"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  listRecommendableUsersAction,
  shareJobRecommendationAction,
} from "@/actions/recommendations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ShareJobForm() {
  const router = useRouter();
  const [users, setUsers] = useState<Array<{ id: string; username: string }>>(
    [],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [applicationUrl, setApplicationUrl] = useState("");
  const [position, setPosition] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [pending, startTransition] = useTransition();

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

  function submit() {
    startTransition(async () => {
      const result = await shareJobRecommendationAction({
        applicationUrl,
        position,
        company: company || undefined,
        note: note || undefined,
        toUserIds: selected,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const names = result.data.usernames.map((name) => `@${name}`).join(", ");
      if (result.data.skipped.length) {
        toast.success(
          `Shared with ${names}. Already pending for: ${result.data.skipped
            .map((name) => `@${name}`)
            .join(", ")}`,
        );
      } else {
        toast.success(`Shared with ${names}`);
      }

      setApplicationUrl("");
      setPosition("");
      setCompany("");
      setNote("");
      setSelected([]);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share a job</CardTitle>
        <p className="text-sm text-muted-foreground">
          Found something for a friend but not applying? Send just the link and
          role — no need to track it yourself.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Job URL <span className="text-destructive">*</span>
          </label>
          <Input
            type="url"
            value={applicationUrl}
            onChange={(e) => setApplicationUrl(e.target.value)}
            placeholder="https://…"
            disabled={pending}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Role name <span className="text-destructive">*</span>
            </label>
            <Input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="SDE Intern, FDE…"
              disabled={pending}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Company (optional)
            </label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              disabled={pending}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Note (optional)
          </label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why this might be a good fit…"
            disabled={pending}
            rows={3}
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Recommend to <span className="text-destructive">*</span>
          </label>
          {loadingUsers ? (
            <p className="text-sm text-muted-foreground">Loading people…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other users to share with yet.
            </p>
          ) : (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
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
                      disabled={pending}
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
        </div>
        <Button
          type="button"
          disabled={
            pending ||
            !applicationUrl.trim() ||
            !position.trim() ||
            !selected.length
          }
          onClick={submit}
        >
          {pending
            ? "Sharing…"
            : selected.length
              ? `Share with ${selected.length}`
              : "Share job"}
        </Button>
      </CardContent>
    </Card>
  );
}
