import type { Dispute } from "./ledger";
import type { AppRole } from "./roles";
import type { Credit, Offense } from "./types";
import { centralWeekday, toCentralYmd } from "./utils";

export function selectStats(offenses: Offense[], role?: AppRole | null) {
  const active = offenses.filter((o) => !o.archived);
  const scoped =
    role === "subject"
      ? active.filter((o) => o.againstRole === "subject" || o.authorRole === "subject")
      : active;

  const now = new Date();
  const todayYmd = toCentralYmd(now);
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const startOfMonthYmd = `${ty}-${String(tm).padStart(2, "0")}-01`;

  const dow = centralWeekday(now);
  const daysFromMonday = (dow + 6) % 7;
  const mondayUtc = new Date(Date.UTC(ty, tm - 1, td - daysFromMonday, 12, 0, 0));
  const startOfWeekYmd = toCentralYmd(mondayUtc);

  const total = scoped.length;
  const open = scoped.filter((o) => o.status === "open").length;
  const thisMonth = scoped.filter((o) => toCentralYmd(o.date) >= startOfMonthYmd).length;
  const thisWeek = scoped.filter((o) => toCentralYmd(o.date) >= startOfWeekYmd).length;
  const avg =
    total === 0
      ? 0
      : Math.round((scoped.reduce((sum, o) => sum + o.severity, 0) / total) * 10) / 10;
  const nuclear = scoped.filter((o) => o.severity === 5).length;
  const slap = scoped.filter((o) => o.severity >= 4).length;

  const sorted = [...scoped].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const last = sorted[0];
  const daysSinceLast = last
    ? Math.floor(
        (Date.UTC(ty, tm - 1, td) -
          (() => {
            const lastYmd = toCentralYmd(last.date);
            const [ly, lm, ld] = lastYmd.split("-").map(Number);
            return Date.UTC(ly, lm - 1, ld);
          })()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const byCategory: Record<string, number> = {};
  for (const o of scoped) {
    byCategory[o.category] = (byCategory[o.category] ?? 0) + 1;
  }

  const bySeverity: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const o of scoped) {
    bySeverity[o.severity] = (bySeverity[o.severity] ?? 0) + 1;
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byWeekday = weekdays.map((name, i) => ({
    name,
    count: scoped.filter((o) => centralWeekday(o.date) === i).length,
  }));

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  return {
    total,
    open,
    thisMonth,
    thisWeek,
    avg,
    nuclear,
    slap,
    daysSinceLast,
    last,
    byCategory,
    bySeverity,
    byWeekday,
    topCategory: topCategory ? { name: topCategory[0], count: topCategory[1] } : null,
  };
}

/** Pattern warnings for the household. */
export function buildWarnings(offenses: Offense[]): string[] {
  const active = offenses.filter((o) => !o.archived && o.status === "open");
  const warnings: string[] = [];
  const today = toCentralYmd(new Date());
  const [ty, tm, td] = today.split("-").map(Number);
  const weekAgo = toCentralYmd(new Date(Date.UTC(ty, tm - 1, td - 7, 12)));
  const dayAgo = toCentralYmd(new Date(Date.UTC(ty, tm - 1, td - 2, 12)));

  const thisWeek = active.filter((o) => toCentralYmd(o.date) >= weekAgo);
  const byCat: Record<string, number> = {};
  for (const o of thisWeek) {
    byCat[o.category] = (byCat[o.category] ?? 0) + 1;
  }
  for (const [cat, n] of Object.entries(byCat)) {
    if (n >= 3) warnings.push(`${n} open “${cat}” hits in the last 7 days.`);
  }

  const recent = active.filter((o) => toCentralYmd(o.date) >= dayAgo);
  const recentCats = new Map<string, number>();
  for (const o of recent) {
    const key = `${o.againstRole}:${o.category}`;
    recentCats.set(key, (recentCats.get(key) ?? 0) + 1);
  }
  for (const [key, n] of recentCats) {
    if (n >= 2) {
      const cat = key.split(":")[1];
      warnings.push(`Same category (“${cat}”) twice in 48 hours.`);
    }
  }

  const nuclearOpen = active.filter((o) => o.severity >= 5).length;
  if (nuclearOpen > 0) {
    warnings.push(`${nuclearOpen} open nuclear-level case${nuclearOpen === 1 ? "" : "s"}.`);
  }

  return warnings;
}

export function buildHeatmap(offenses: Offense[], days = 90): { date: string; count: number }[] {
  const map = new Map<string, number>();
  const today = toCentralYmd(new Date());
  const [ty, tm, td] = today.split("-").map(Number);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1, td - i, 12));
    map.set(toCentralYmd(d), 0);
  }
  for (const o of offenses) {
    if (o.archived) continue;
    const ymd = toCentralYmd(o.date);
    if (map.has(ymd)) map.set(ymd, (map.get(ymd) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export function buildScoreboard(
  offenses: Offense[],
  disputes: Dispute[],
  credits: Credit[],
  role: AppRole,
) {
  const againstMe = offenses.filter((o) => !o.archived && o.againstRole === role);
  const byMe = offenses.filter((o) => !o.archived && o.authorRole === role);
  const myDisputes = disputes.filter((d) => d.authorRole === role);
  const won = myDisputes.filter((d) => d.status === "accepted").length;
  const lost = myDisputes.filter((d) => d.status === "rejected").length;
  const pending = myDisputes.filter((d) => d.status === "pending").length;
  const acceptedCredits = credits.filter(
    (c) => c.aboutRole === role && c.status === "accepted",
  ).length;
  const openAgainst = againstMe.filter((o) => o.status === "open").length;
  const forgivenAgainst = againstMe.filter((o) => o.status === "forgiven").length;
  const nuclear = againstMe.filter((o) => o.severity === 5).length;
  const stats = selectStats(offenses);
  return {
    openAgainst,
    forgivenAgainst,
    totalAgainst: againstMe.length,
    loggedByMe: byMe.length,
    disputeWon: won,
    disputeLost: lost,
    disputePending: pending,
    disputeWinRate: won + lost === 0 ? null : Math.round((won / (won + lost)) * 100),
    creditsAccepted: acceptedCredits,
    nuclear,
    peaceStreak: stats.daysSinceLast,
  };
}

export function daysUntilNext(ymd: string): number {
  const today = toCentralYmd(new Date());
  const [ty, tm, td] = today.split("-").map(Number);
  const [, mm, dd] = ymd.split("-").map(Number);
  let next = Date.UTC(ty, mm - 1, dd, 12);
  const todayUtc = Date.UTC(ty, tm - 1, td, 12);
  if (next < todayUtc) next = Date.UTC(ty + 1, mm - 1, dd, 12);
  return Math.round((next - todayUtc) / 86400000);
}
