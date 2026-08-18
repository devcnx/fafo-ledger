import type { AppRole } from "./roles";
import type { FindOut, Offense, Perk, Severity } from "./types";
import { toCentralYmd } from "./utils";
import { isPerkSpendable } from "./perks";

export const REPEAT_WINDOW_DAYS = 30;

export function windowStartYmd(now = new Date()): string {
  const today = toCentralYmd(now);
  const [y, m, d] = today.split("-").map(Number);
  return toCentralYmd(new Date(Date.UTC(y, m - 1, d - REPEAT_WINDOW_DAYS, 12, 0, 0)));
}

export function countCategoryRepeats(
  offenses: Pick<Offense, "date" | "category" | "againstRole" | "archived" | "status">[],
  category: string,
  againstRole: AppRole,
  now = new Date(),
): number {
  const from = windowStartYmd(now);
  const cat = category.trim().toLowerCase();
  return offenses.filter(
    (o) =>
      !o.archived &&
      o.status !== "forgiven" &&
      o.againstRole === againstRole &&
      o.category.trim().toLowerCase() === cat &&
      toCentralYmd(o.date) >= from,
  ).length;
}

export function upgradeSeverity(severity: number, repeatCount: number): Severity {
  const bump = Math.max(0, repeatCount - 1);
  return Math.min(5, Math.max(1, severity + bump)) as Severity;
}

export function repeatDueDays(repeatCount: number, baseDays: number): number {
  if (repeatCount < 2) return baseDays;
  return Math.max(1, baseDays - (repeatCount - 1) * 2);
}

export function stampRepeatTax(
  title: string,
  body: string,
  repeatCount: number,
  category: string,
): { title: string; body: string; note: string } {
  if (repeatCount < 2) return { title, body, note: "" };
  const clean = title.replace(/^Repeat Tax:\s*/i, "");
  return {
    title: `Repeat Tax: ${clean}`,
    body: [body.trim(), `Repeat #${repeatCount} In ${category} (Last ${REPEAT_WINDOW_DAYS} Days). Perk Path Closed. FO Path Open.`]
      .filter(Boolean)
      .join("\n\n"),
    note: `Repeat #${repeatCount} · ${category}`,
  };
}

export function pickPerkToBurn(perks: Perk[], assignedToRole: AppRole): Perk | null {
  const bank = perks
    .filter((p) => p.assignedToRole === assignedToRole && isPerkSpendable(p))
    .sort((a, b) => {
      if (a.kind === "jail_pass" && b.kind !== "jail_pass") return 1;
      if (b.kind === "jail_pass" && a.kind !== "jail_pass") return -1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  return bank[0] ?? null;
}

export function hasOpenFindOut(findOuts: Pick<FindOut, "assignedToRole" | "status">[], role: AppRole) {
  return findOuts.some(
    (f) =>
      f.assignedToRole === role &&
      (f.status === "issued" || f.status === "acknowledged" || f.status === "appealed"),
  );
}
