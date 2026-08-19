import type { FindOut, FindOutStatus } from "./types";
import { toCentralYmd } from "./utils";

export function addCentralDays(days: number, from?: string | null): string {
  const today = toCentralYmd(new Date());
  const raw = from && /^\d{4}-\d{2}-\d{2}/.test(from) ? from.slice(0, 10) : today;
  const base = raw < today ? today : raw;
  const [y, m, d] = base.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0)).toISOString().slice(0, 10);
}

export function findOutStatusLabel(s: FindOutStatus) {
  if (s === "issued") return "Issued";
  if (s === "acknowledged") return "Acknowledged";
  if (s === "served") return "Served";
  if (s === "waived") return "Waived";
  if (s === "appealed") return "Appealed";
  return s;
}

export function isFindOutClosed(fo: Pick<FindOut, "status">): boolean {
  return fo.status === "served" || fo.status === "waived";
}

export function isFindOutOpen(fo: Pick<FindOut, "status">): boolean {
  return fo.status === "issued" || fo.status === "acknowledged" || fo.status === "appealed";
}

export function isFindOutOverdue(fo: Pick<FindOut, "status" | "dueDate">): boolean {
  if (!fo.dueDate || isFindOutClosed(fo)) return false;
  return fo.dueDate < toCentralYmd(new Date());
}

export function findOutBadgeVariant(fo: Pick<FindOut, "status" | "dueDate">) {
  if (fo.status === "served") return "success" as const;
  if (fo.status === "waived") return "muted" as const;
  if (fo.status === "appealed") return "warn" as const;
  if (isFindOutOverdue(fo)) return "danger" as const;
  return "default" as const;
}
