import { Printer } from "lucide-react";
import { SeverityBadge } from "@/components/severity-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLedger } from "@/lib/ledger-context";
import { selectStats } from "@/lib/store";
import { daysBetween, formatDate, formatDateTime } from "@/lib/utils";

export function FafoReport() {
  const { profile, offenses, disputes, settings } = useLedger();
  const active = offenses.filter((o) => !o.archived);
  const s = selectStats(active);

  const openOnes = [...active]
    .filter((o) => o.status === "open")
    .sort(
      (a, b) =>
        b.severity - a.severity || new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  const topHits = [...active]
    .sort(
      (a, b) =>
        b.severity - a.severity || new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    .slice(0, 10);

  const togetherDays = daysBetween(profile.anniversary);
  const pendingDisputes = disputes.filter((d) => d.status === "pending");
  const closedDisputes = disputes.filter((d) => d.status === "accepted" || d.status === "rejected");

  return (
    <div className="space-y-4 print:space-y-3">
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-primary px-5 py-6 text-primary-fg sm:px-8">
          <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-80">
            Official FAFO Report
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Household ledger packet
          </h2>
          <p className="mt-2 max-w-xl text-sm opacity-90">
            {profile.trackerName} ⇄ {profile.subjectName}. Fuck around and find out — with
            timestamps, severity, evidence, and dispute outcomes. Central time.
          </p>
        </div>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 sm:gap-6">
              <Meta label="Total receipts" value={String(s.total)} />
              <Meta label="Open cases" value={String(s.open)} />
              <Meta label="Avg severity" value={s.total ? s.avg.toFixed(1) : "—"} />
              <Meta label="Days together" value={String(togetherDays)} />
            </div>
            <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
              <Printer className="size-4" />
              Print / save PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Executive summary</CardTitle>
          <CardDescription>For when someone asks “what did I do?”</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-fg">
          <p>
            Shared ledger for <strong>{profile.trackerName}</strong> and{" "}
            <strong>{profile.subjectName}</strong> since anniversary{" "}
            <strong>{formatDate(profile.anniversary)}</strong>.
          </p>
          <p>
            There {s.total === 1 ? "is" : "are"} <strong>{s.total}</strong> logged offense
            {s.total === 1 ? "" : "s"}, of which <strong>{s.open}</strong> remain open.
            {s.topCategory
              ? ` Leading category: ${s.topCategory.name} (${s.topCategory.count}).`
              : ""}
            {s.slap > 0 ? ` ${s.slap} entries reached slap-worthy or nuclear severity.` : ""}
          </p>
          <p>
            Open disputes: <strong>{pendingDisputes.length}</strong>. Closed rulings:{" "}
            <strong>{closedDisputes.length}</strong>.
          </p>
          {s.daysSinceLast !== null ? (
            <p>
              Days since the last logged offense: <strong>{s.daysSinceLast}</strong>.
              {s.daysSinceLast === 0
                ? " The peace streak is currently zero."
                : " Keep going."}
            </p>
          ) : (
            <p>No offenses on file. Either angel mode or logging hasn’t started.</p>
          )}
        </CardContent>
      </Card>

      {openOnes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Open cases (severity first)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openOnes.map((o) => (
              <div key={o.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={o.severity} labels={settings.severityLabels} />
                  <Badge variant="muted">{o.category}</Badge>
                  <time className="text-xs text-fg-muted">{formatDateTime(o.date)}</time>
                </div>
                <p className="mt-1 font-semibold">{o.title}</p>
                <p className="text-sm text-fg-muted">{o.description}</p>
                {o.evidence.length > 0 ? (
                  <p className="mt-1 text-xs text-fg-subtle">
                    {o.evidence.length} evidence item{o.evidence.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Top 10 hits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topHits.length === 0 ? (
            <p className="text-sm text-fg-muted">Nothing on file.</p>
          ) : (
            topHits.map((o, i) => (
              <div
                key={o.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2 last:border-0"
              >
                <div>
                  <span className="mr-2 text-xs font-semibold text-fg-subtle">#{i + 1}</span>
                  <span className="font-medium">{o.title}</span>
                  <span className="text-fg-muted"> · {o.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={o.severity} labels={settings.severityLabels} />
                  <span className="text-xs text-fg-muted">{formatDate(o.date)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {closedDisputes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Dispute outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {closedDisputes.map((d) => (
              <div key={d.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{d.kind}</Badge>
                  <Badge variant={d.status === "accepted" ? "success" : "danger"}>{d.status}</Badge>
                  <span className="text-xs text-fg-muted">{formatDateTime(d.createdAt)}</span>
                </div>
                <p className="mt-1">{d.body}</p>
                {d.response ? (
                  <p className="mt-1 text-fg-muted">Ruling: {d.response}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-xs text-fg-subtle">
        Generated {formatDateTime(new Date().toISOString())} · Private ledger for{" "}
        {profile.trackerName} & {profile.subjectName}
      </p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] font-medium tracking-wide text-fg-muted uppercase">{label}</div>
    </div>
  );
}
