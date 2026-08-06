import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEVERITY_META, severityLabel } from "@/lib/constants";
import { useLedger } from "@/lib/ledger-context";
import { buildWarnings, selectStats } from "@/lib/store";
import type { Severity } from "@/lib/types";
import { formatDate, toCentralYmd } from "@/lib/utils";

const SEV_COLORS = ["#78716c", "#a16207", "#c2410c", "#b8331d", "#7f1d1d"];

export function Insights() {
  const { offenses, profile, settings } = useLedger();
  const active = offenses.filter((o) => !o.archived);
  const s = selectStats(active);
  const warnings = buildWarnings(active);
  const subject = profile.subjectName;

  const severityData = ([1, 2, 3, 4, 5] as Severity[]).map((n) => ({
    name: severityLabel(n, settings.severityLabels).slice(0, 12),
    count: s.bySeverity[n] ?? 0,
    fill: SEV_COLORS[n - 1],
  }));

  const categoryData = Object.entries(s.byCategory)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const monthly = buildMonthly(active);
  const insights = buildInsights(s, subject);

  if (active.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="font-display text-xl font-semibold">No data yet</p>
          <p className="mt-2 text-sm text-fg-muted">
            Log a few offenses and patterns will show up here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {warnings.length > 0 ? (
        <Card className="border-warn/30">
          <CardHeader>
            <CardTitle className="text-warn">Active warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {warnings.map((w) => (
              <p key={w} className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-fg">
                {w}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Pattern notes</CardTitle>
          <CardDescription>Auto-generated from the ledger (Central time).</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights.map((line) => (
              <li
                key={line}
                className="rounded-xl border border-border bg-bg px-4 py-3 text-sm text-fg"
              >
                {line}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By severity</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--color-fg-muted)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By day of week</CardTitle>
            <CardDescription>Central time.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.byWeekday} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--color-fg-muted)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--color-fg-muted)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-bg-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top categories</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: "var(--color-fg-muted)", fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly volume</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--color-fg-muted)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Bar dataKey="count" fill="var(--color-sev-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {s.last ? (
        <Card>
          <CardHeader>
            <CardTitle>Most recent</CardTitle>
            <CardDescription>{formatDate(s.last.date)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{s.last.title}</p>
            <p className="mt-1 text-sm text-fg-muted">{s.last.description}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function buildMonthly(offenses: { date: string }[]) {
  const map = new Map<string, number>();
  for (const o of offenses) {
    const ymd = toCentralYmd(o.date);
    const key = ymd.slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, count]) => {
      const [y, m] = key.split("-");
      const name = new Date(Date.UTC(Number(y), Number(m) - 1, 15)).toLocaleString("en-US", {
        timeZone: "UTC",
        month: "short",
        year: "2-digit",
      });
      return { name, count };
    });
}

function buildInsights(s: ReturnType<typeof selectStats>, subject: string): string[] {
  const first = subject.split(" ")[0] || subject;
  const lines: string[] = [];
  lines.push(
    `Ledger holds ${s.total} offense${s.total === 1 ? "" : "s"} with ${s.open} still open.`,
  );
  if (s.avg > 0) lines.push(`Average severity sits at ${s.avg.toFixed(1)} / 5.`);
  if (s.topCategory) {
    lines.push(
      `Top category: ${s.topCategory.name} (${s.topCategory.count} time${s.topCategory.count === 1 ? "" : "s"}).`,
    );
  }
  if (s.slap > 0) {
    lines.push(
      `${s.slap} slap-or-worse entries. ${first} has been in deep water more than once.`,
    );
  }
  if (s.nuclear > 0) {
    lines.push(`${s.nuclear} nuclear event${s.nuclear === 1 ? "" : "s"} on record.`);
  }
  const worstDay = [...s.byWeekday].sort((a, b) => b.count - a.count)[0];
  if (worstDay && worstDay.count > 0) {
    lines.push(`Most common day: ${worstDay.name} (${worstDay.count}).`);
  }
  if (s.daysSinceLast !== null) {
    lines.push(
      s.daysSinceLast === 0
        ? `Last offense was today. Peace streak: reset.`
        : `Days since last offense: ${s.daysSinceLast}.`,
    );
  }
  return lines;
}
