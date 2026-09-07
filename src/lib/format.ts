import { format, formatDistanceToNow } from "date-fns";
import type { SalaryPeriod } from "@/db/schema";

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy");
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
