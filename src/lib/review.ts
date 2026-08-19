import type { AppRole } from "./roles";
import type { Credit, FindOut, Offense, Perk, Quote } from "./types";
import { toCentralYmd } from "./utils";

export type ReviewPeriod = "month" | "year";

export type ReviewStats = {
  period: ReviewPeriod;
  label: string;
  from: string;
  to: string;
  faLogged: number;
  foIssued: number;
  foServed: number;
  foWaived: number;
  perksEarned: number;
  perksBurned: number;
  longestPeace: number;
  topCategory: { name: string; count: number } | null;
  worstWeek: { start: string; count: number } | null;
  nuclear: number;
  quoteOfPeriod: string | null;
  byRole: Record<AppRole, { faAgainst: number; foServed: number; perksEarned: number }>;
};

function periodBounds(period: ReviewPeriod, today = toCentralYmd(new Date())): { from: string; to: string; label: string } {
  const [y, m] = today.split("-").map(Number);
  if (period === "month") {
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const monthName = new Date(Date.UTC(y, m - 1, 15)).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    return { from, to: today, label: monthName };
  }
  return { from: `${y}-01-01`, to: today, label: String(y) };
}

function inRange(ymd: string, from: string, to: string) {
  return ymd >= from && ymd <= to;
}

function weekStart(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = dt.getUTCDay();
  const mondayBack = (dow + 6) % 7;
  return toCentralYmd(new Date(Date.UTC(y, m - 1, d - mondayBack, 12)));
}

export function buildReview(
  period: ReviewPeriod,
  input: {
    offenses: Offense[];
    findOuts: FindOut[];
    perks: Perk[];
    quotes: Quote[];
    credits?: Credit[];
  },
): ReviewStats {
  const { from, to, label } = periodBounds(period);
  const offenses = input.offenses.filter((o) => !o.archived && inRange(toCentralYmd(o.date), from, to));
  const findOuts = input.findOuts.filter((f) => inRange(toCentralYmd(f.createdAt), from, to));
  const perks = input.perks.filter((p) => inRange(toCentralYmd(p.createdAt), from, to));
  const quotes = input.quotes.filter((q) => inRange(toCentralYmd(q.createdAt), from, to));

  const byCat: Record<string, number> = {};
  for (const o of offenses) byCat[o.category] = (byCat[o.category] ?? 0) + 1;
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  const byWeek = new Map<string, number>();
  for (const o of offenses) {
    const w = weekStart(toCentralYmd(o.date));
    byWeek.set(w, (byWeek.get(w) ?? 0) + 1);
  }
  const worst = [...byWeek.entries()].sort((a, b) => b[1] - a[1])[0];

  const dates = [...offenses.map((o) => toCentralYmd(o.date))].sort();
  let longest = 0;
  if (dates.length === 0) {
    longest = Math.max(0, daysInclusive(from, to));
  } else {
    let prev = from;
    for (const d of dates) {
      longest = Math.max(longest, Math.max(0, daysInclusive(prev, d) - 1));
      prev = d;
    }
    longest = Math.max(longest, Math.max(0, daysInclusive(prev, to)));
  }

  const pinned = quotes.find((q) => q.pinned) ?? quotes[0];

  const emptyRole = { faAgainst: 0, foServed: 0, perksEarned: 0 };
  const byRole: ReviewStats["byRole"] = {
    tracker: { ...emptyRole },
    subject: { ...emptyRole },
  };
  for (const o of offenses) byRole[o.againstRole].faAgainst += 1;
  for (const f of findOuts) {
    if (f.status === "served") byRole[f.assignedToRole].foServed += 1;
  }
  for (const p of perks) {
    if (p.status !== "revoked") byRole[p.assignedToRole].perksEarned += 1;
  }

  return {
    period,
    label,
    from,
    to,
    faLogged: offenses.length,
    foIssued: findOuts.length,
    foServed: findOuts.filter((f) => f.status === "served").length,
    foWaived: findOuts.filter((f) => f.status === "waived").length,
    perksEarned: perks.filter((p) => p.status !== "revoked" && p.status !== "burned").length,
    perksBurned: perks.filter((p) => p.status === "burned").length,
    longestPeace: longest,
    topCategory: top ? { name: top[0], count: top[1] } : null,
    worstWeek: worst ? { start: worst[0], count: worst[1] } : null,
    nuclear: offenses.filter((o) => o.severity >= 5).length,
    quoteOfPeriod: pinned?.quoteText ?? null,
    byRole,
  };
}

function daysInclusive(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}
