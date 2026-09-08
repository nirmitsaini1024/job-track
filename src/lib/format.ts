import { format, formatDistanceToNow } from "date-fns";
import type { SalaryPeriod } from "@/db/schema";

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy");
}

/** Parse a `yyyy-MM-dd` date input into a local noon Date (avoids TZ day shifts). */
export function parseAppliedDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function toAppliedDateInputValue(
  value: Date | string | null | undefined,
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatRelative(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatSalary(input: {
  min?: number | null;
  max?: number | null;
  currency?: string | null;
  period?: SalaryPeriod | string | null;
}): string {
  const { min, max, currency, period } = input;
  if (min == null && max == null) return "—";

  const formattedMin = min != null ? formatMoney(min, currency) : null;
  const formattedMax = max != null ? formatMoney(max, currency) : null;

  let range = "—";
  if (formattedMin && formattedMax) {
    range = formattedMin === formattedMax ? formattedMin : `${formattedMin} – ${formattedMax}`;
  } else {
    range = formattedMin ?? formattedMax ?? "—";
  }

  const periodLabel =
    period === "YEAR"
      ? "/yr"
      : period === "MONTH"
        ? "/mo"
        : period === "HOUR"
          ? "/hr"
          : "";

  return `${range}${periodLabel}`;
}

function formatMoney(amount: number, currency?: string | null): string {
  const code = (currency ?? "").toUpperCase();

  if (code === "INR" || code === "RS" || code === "₹") {
    if (amount >= 100000) {
      const lakhs = amount / 100000;
      const digits = lakhs >= 10 ? 0 : 1;
      return `₹${lakhs.toFixed(digits)}L`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  }

  if (code.length === 3) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${code} ${amount.toLocaleString()}`;
    }
  }

  if (code) {
    return `${code} ${amount.toLocaleString()}`;
  }

  return amount.toLocaleString();
}

export function formatExperience(
  min?: number | null,
  max?: number | null,
): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null) {
    return min === max ? `${min} yrs` : `${min}–${max} yrs`;
  }
  if (min != null) return `${min}+ yrs`;
  return `Up to ${max} yrs`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

/** Digits only → Indian grouping, e.g. 100000 → "1,00,000" */
export function formatIndianNumber(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const digits =
    typeof value === "number"
      ? String(Math.trunc(Math.abs(value)))
      : value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-IN");
}

/** "1,00,000" → 100000 (or null if empty/invalid) */
export function parseIndianNumber(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

