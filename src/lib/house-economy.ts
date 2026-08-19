import type { AppRole } from "./roles";
import type { Bond, Offense, PeaceMilestone, PeaceStreakInfo, PerkKind } from "./types";
import { daysBetween, toCentralYmd } from "./utils";

export const PEACE_MILESTONES: PeaceMilestone[] = [7, 14, 30];

export const PEACE_PERKS: Record<
  PeaceMilestone,
  { title: string; body: string; kind: PerkKind; expiresDays: number }
> = {
  7: {
    title: "One Clean Week",
    body: "Dinner Is Your Call. I Pay And Pick Up.",
    kind: "favor",
    expiresDays: 14,
  },
  14: {
    title: "Two Clean Weeks",
    body: "Sleep-In Pass. I Take Morning Duty.",
    kind: "pass",
    expiresDays: 21,
  },
  30: {
    title: "A Clean Month",
    body: "Phone-Free Date Night. I Plan It.",
    kind: "date",
    expiresDays: 30,
  },
};

export const CALENDAR_PERKS = {
  birthday: {
    title: "Birthday Perk — Your Day",
    body: "You Name It. I Do It. Within Reason.",
    kind: "favor" as PerkKind,
    expiresDays: 21,
  },
  anniversary: {
    title: "Anniversary Perk",
    body: "One No-Questions Favor. We Made It Another Year.",
    kind: "favor" as PerkKind,
    expiresDays: 30,
  },
};

export const PAROLE_DAYS = 14;
export const DEFAULT_STATUTE_DAYS = 45;
export const DEFAULT_COOLING_MINUTES = 20;
export const COOLING_SEVERITY = 4;

export function mmdd(ymd: string): string {
  return ymd.slice(5, 10);
}

export function thisYear(): number {
  return Number(toCentralYmd(new Date()).slice(0, 4));
}

/** Next occurrence of an MM-DD on or after today (Central). */
export function nextOccurrenceYmd(ymd: string, from = toCentralYmd(new Date())): string {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [, mm, dd] = ymd.split("-").map(Number);
  let year = fy;
  const candidate = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  if (candidate >= from) return candidate;
  year += 1;
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function isTodayMmDd(ymd: string, today = toCentralYmd(new Date())): boolean {
  return mmdd(ymd) === mmdd(today);
}

export function daysUntilMmDd(ymd: string, today = toCentralYmd(new Date())): number {
  return daysBetween(today, nextOccurrenceYmd(ymd, today));
}

export function lastOffenseAgainstYmd(
  offenses: Pick<Offense, "date" | "againstRole" | "archived" | "status">[],
  role: AppRole,
): string | null {
  const hits = offenses.filter(
    (o) =>
      !o.archived &&
      o.status !== "forgiven" &&
      o.status !== "stale" &&
      o.againstRole === role,
  );
  if (hits.length === 0) return null;
  return hits.map((o) => toCentralYmd(o.date)).sort().at(-1) ?? null;
}

export function streakStartKey(
  offenses: Pick<Offense, "date" | "againstRole" | "archived" | "status">[],
  role: AppRole,
): string {
  const last = lastOffenseAgainstYmd(offenses, role);
  if (!last) return "clean-start";
  const [y, m, d] = last.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0)).toISOString().slice(0, 10);
}

export function peaceStreakDays(
  offenses: Pick<Offense, "date" | "againstRole" | "archived" | "status">[],
  role: AppRole,
  today = toCentralYmd(new Date()),
): number {
  const last = lastOffenseAgainstYmd(offenses, role);
  if (!last) return 999;
  return Math.max(0, daysBetween(last, today));
}

export function nextPeaceMilestone(days: number): PeaceMilestone | null {
  for (const m of PEACE_MILESTONES) {
    if (days < m) return m;
  }
  return null;
}

export function buildPeaceStreaks(
  offenses: Pick<Offense, "date" | "againstRole" | "archived" | "status">[],
  roles: AppRole[] = ["tracker", "subject"],
): PeaceStreakInfo[] {
  return roles.map((role) => {
    const days = peaceStreakDays(offenses, role);
    const next = nextPeaceMilestone(days);
    return {
      role,
      days,
      nextMilestone: next,
      daysUntilNext: next == null ? 0 : next - days,
      streakStart: streakStartKey(offenses, role),
    };
  });
}

export function statuteClockStart(o: Pick<Offense, "date" | "statuteResetOn">): string {
  if (o.statuteResetOn && /^\d{4}-\d{2}-\d{2}/.test(o.statuteResetOn)) {
    return o.statuteResetOn.slice(0, 10);
  }
  return toCentralYmd(o.date);
}

export function offenseAgeDays(
  o: Pick<Offense, "date" | "statuteResetOn">,
  today = toCentralYmd(new Date()),
): number {
  return Math.max(0, daysBetween(statuteClockStart(o), today));
}

export function shouldStale(
  o: Pick<Offense, "date" | "status" | "archived" | "statuteResetOn">,
  statuteDays: number,
  today = toCentralYmd(new Date()),
): boolean {
  if (statuteDays <= 0) return false;
  if (o.archived) return false;
  if (o.status !== "open" && o.status !== "pattern") return false;
  return offenseAgeDays(o, today) >= statuteDays;
}

export function isTruceActive(truceUntil: string | null | undefined, today = toCentralYmd(new Date())) {
  return Boolean(truceUntil && truceUntil >= today);
}

export function activeParoles<T extends { endsOn: string; role: AppRole; category: string }>(
  paroles: T[],
  role: AppRole,
  category?: string,
  today = toCentralYmd(new Date()),
): T[] {
  return paroles.filter((p) => {
    if (p.role !== role) return false;
    if (p.endsOn < today) return false;
    if (category && p.category.trim().toLowerCase() !== category.trim().toLowerCase()) return false;
    return true;
  });
}

export function bondsAtRisk(
  bonds: Bond[],
  role: AppRole,
  category: string,
): Bond[] {
  const cat = category.trim().toLowerCase();
  return bonds.filter(
    (b) =>
      b.status === "escrow" &&
      b.assignedToRole === role &&
      b.category.trim().toLowerCase() === cat,
  );
}

export function coolingStorageKey() {
  return "fafo-cooloff-v1";
}

export function installDismissKey() {
  return "fafo-install-dismissed-v1";
}
