"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APPLICATION_STATUSES, REMOTE_TYPES, STATUS_LABELS, REMOTE_LABELS } from "@/lib/constants";
import { nativeSelectClassName } from "@/lib/select-styles";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

const selectClass = nativeSelectClassName;

const FILTER_KEYS = [
  "q",
  "position",
  "location",
  "status",
  "remoteType",
  "source",
  "salaryMin",
  "salaryMax",
  "ghosted",
  "sort",
  "experienceMin",
  "experienceMax",
  "dateFrom",
  "dateTo",
  "appliedFrom",
  "appliedTo",
] as const;

export function ApplicationFilters({ showSearch = true }: { showSearch?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const activeCount = useMemo(() => {
    let count = 0;
    for (const key of FILTER_KEYS) {
      if (key === "sort" && (params.get(key) ?? "lastActivity") === "lastActivity") {
        continue;
      }
      if (key === "q" && !showSearch) continue;
      const value = params.get(key);
      if (value) count += 1;
    }
    return count;
  }, [params, showSearch]);

  function update(next: Record<string, string | undefined>) {
    const copy = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) copy.delete(key);
      else copy.set(key, value);
    }
    copy.delete("page");
    const query = copy.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function clear() {
    router.push(pathname);
  }

  return (
    <div className="grid min-w-0 gap-3 overflow-hidden rounded-md border bg-card p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-sm font-medium text-foreground hover:border-border hover:bg-muted/60"
          aria-expanded={open}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <SlidersHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
            Filters
            {activeCount > 0 ? (
              <span className="rounded-md border bg-muted px-1.5 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
                {activeCount}
              </span>
            ) : null}
          </span>
          {open ? (
            <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
        {activeCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={clear}
          >
            Reset
          </Button>
        ) : null}
      </div>

      {open ? (
        <>
          {showSearch ? (
            <Input
              placeholder="Search company, position, location, skills"
              defaultValue={params.get("q") ?? ""}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  update({ q: event.currentTarget.value });
                }
              }}
              onBlur={(event) => update({ q: event.currentTarget.value })}
            />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Position">
              <Input
                defaultValue={params.get("position") ?? ""}
                placeholder="Any"
                onBlur={(e) => update({ position: e.currentTarget.value })}
              />
            </Field>
            <Field label="Location">
              <Input
                defaultValue={params.get("location") ?? ""}
                placeholder="Any"
                onBlur={(e) => update({ location: e.currentTarget.value })}
              />
            </Field>
            <Field label="Status">
              <select
                className={selectClass}
                defaultValue={params.get("status") ?? ""}
                onChange={(e) => update({ status: e.currentTarget.value })}
              >
                <option value="">All statuses</option>
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Remote">
              <select
                className={selectClass}
                defaultValue={params.get("remoteType") ?? ""}
                onChange={(e) => update({ remoteType: e.currentTarget.value })}
              >
                <option value="">All types</option>
                {REMOTE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {REMOTE_LABELS[type]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <Input
                defaultValue={params.get("source") ?? ""}
                placeholder="LinkedIn, referral…"
                onBlur={(e) => update({ source: e.currentTarget.value })}
              />
            </Field>
            <Field label="Salary min">
              <Input
                type="number"
                defaultValue={params.get("salaryMin") ?? ""}
                placeholder="0"
                onBlur={(e) => update({ salaryMin: e.currentTarget.value })}
              />
            </Field>
            <Field label="Salary max">
              <Input
                type="number"
                defaultValue={params.get("salaryMax") ?? ""}
                placeholder="Any"
                onBlur={(e) => update({ salaryMax: e.currentTarget.value })}
              />
            </Field>
            <Field label="Ghosted">
              <select
                className={selectClass}
                defaultValue={params.get("ghosted") ?? ""}
                onChange={(e) => update({ ghosted: e.currentTarget.value })}
              >
                <option value="">All</option>
                <option value="true">Ghosted only</option>
                <option value="false">Not ghosted</option>
              </select>
            </Field>
            {showSearch ? (
              <Field label="Sort">
                <select
                  className={selectClass}
                  defaultValue={params.get("sort") ?? "lastActivity"}
                  onChange={(e) => update({ sort: e.currentTarget.value })}
                >
                  <option value="lastActivity">Last activity</option>
                  <option value="appliedAt">Applied date</option>
                  <option value="company">Company</option>
                  <option value="status">Status</option>
                  <option value="createdAt">Created</option>
                </select>
              </Field>
            ) : null}
            <Field label="Experience min">
              <Input
                type="number"
                defaultValue={params.get("experienceMin") ?? ""}
                onBlur={(e) => update({ experienceMin: e.currentTarget.value })}
              />
            </Field>
            <Field label="Experience max">
              <Input
                type="number"
                defaultValue={params.get("experienceMax") ?? ""}
                onBlur={(e) => update({ experienceMax: e.currentTarget.value })}
              />
            </Field>
            <Field label={pathname === "/" ? "Created from" : "Applied from"}>
              <Input
                type="date"
                defaultValue={
                  pathname === "/"
                    ? (params.get("dateFrom") ?? "")
                    : (params.get("appliedFrom") ?? "")
                }
                onChange={(e) =>
                  update(
                    pathname === "/"
                      ? { dateFrom: e.currentTarget.value }
                      : { appliedFrom: e.currentTarget.value },
                  )
                }
              />
            </Field>
            <Field label={pathname === "/" ? "Created to" : "Applied to"}>
              <Input
                type="date"
                defaultValue={
                  pathname === "/"
                    ? (params.get("dateTo") ?? "")
                    : (params.get("appliedTo") ?? "")
                }
                onChange={(e) =>
                  update(
                    pathname === "/"
                      ? { dateTo: e.currentTarget.value }
                      : { appliedTo: e.currentTarget.value },
                  )
                }
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clear}>
              Reset filters
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
