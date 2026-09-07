"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
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

export function ApplicationFilters({ showSearch = true }: { showSearch?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

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
    <div className="grid gap-3 rounded-xl border bg-card p-4">
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
    </div>
  );
}
