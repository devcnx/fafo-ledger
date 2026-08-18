import { Printer } from "lucide-react";
import { SeverityBadge } from "@/components/severity-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLedger } from "@/lib/ledger-context";
import { selectStats } from "@/lib/store";
import { daysBetween, formatDate, formatDateTime } from "@/lib/utils";

export function FafoReport() {
  const { profile, offenses, disputes, findOuts, role, settings } = useLedger();
  const stats = selectStats(offenses, role);

  const open = offenses
    .filter((o) => o.status === "open")
    .sort(
      (a, b) =>
        b.severity - a.severity || new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  const top = [...offenses]
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
            Household Ledger Packet
          </h2>
          <p className="mt-2 max-w-xl text-sm opacity-90">
            {profile.trackerName} ⇄ {profile.subjectName}. Fuck Around and Find Out — With
            Receipts. Generated for the Record.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="border-0 bg-primary-fg/15 text-primary-fg">
              {stats.total} FA Logged
            </Badge>
            <Badge className="border-0 bg-primary-fg/15 text-primary-fg">
              {findOuts.length} FO Issued
            </Badge>
            <Badge className="border-0 bg-primary-fg/15 text-primary-fg">
              {findOuts.filter((f) => f.status === "served").length} FO Served
            </Badge>
            <Badge className="border-0 bg-primary-fg/15 text-primary-fg">
              {stats.open} Open FA
            </Badge>
            <Badge className="border-0 bg-primary-fg/15 text-primary-fg">
              {togetherDays} Days Together
            </Badge>
            <Badge className="border-0 bg-primary-fg/15 text-primary-fg">
              Anniv {formatDate(profile.anniversary)}
            </Badge>
          </div>
        </div>
        <CardContent className="flex flex-wrap gap-2 pt-5 print:hidden">
          <Button type="button" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print / Save PDF
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
          <CardDescription>For When Someone Asks “What Did I Do?”</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-fg">
          <p>
            This packet documents <strong>{stats.total}</strong> logged fuck-around
            {stats.total === 1 ? "" : "s"} and <strong>{findOuts.length}</strong> Find Out
            {findOuts.length === 1 ? "" : "s"} on the household ledger.{" "}
            <strong>{stats.open}</strong> FA remain open.{" "}
            {stats.thisMonth > 0
              ? `${stats.thisMonth} landed this calendar month (Central).`
              : "None this calendar month (Central)."}{" "}
            {stats.slap + stats.nuclear > 0
              ? `${stats.slap + stats.nuclear} sit at slap-level or nuclear.`
              : "No slap-level or nuclear entries on file."}
          </p>
          {pendingDisputes.length > 0 ? (
            <p className="text-warn">
              {pendingDisputes.length} dispute{pendingDisputes.length === 1 ? "" : "s"} pending
              ruling.
            </p>
          ) : null}
          {findOuts.filter((f) => f.status === "issued" || f.status === "acknowledged").length >
          0 ? (
            <p>
              <strong>
                {
                  findOuts.filter((f) => f.status === "issued" || f.status === "acknowledged")
                    .length
                }
              </strong>{" "}
              Find Out{findOuts.filter((f) => f.status === "issued" || f.status === "acknowledged").length === 1 ? "" : "s"} still outstanding. FA without serving FO is unfinished business.
            </p>
          ) : findOuts.length === 0 && stats.total > 0 ? (
            <p className="text-warn">
              Offenses on file, zero Find Outs issued. The coworker is right — this packet is all
              FA and no FO.
            </p>
          ) : null}
          {stats.total === 0 ? (
            <p className="text-fg-muted">
              No Offenses on File. Either Angel Mode or Logging Hasn’t Started.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {findOuts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Find Outs On The Record</CardTitle>
            <CardDescription>The Bill For The Fuck Around.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {findOuts.map((f) => (
              <div key={f.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      f.status === "served" ? "success" : f.status === "waived" ? "muted" : "danger"
                    }
                  >
                    {f.status === "issued"
                      ? "Issued"
                      : f.status === "acknowledged"
                        ? "Acknowledged"
                        : f.status === "served"
                          ? "Served"
                          : f.status === "waived"
                            ? "Waived"
                            : "Appealed"}
                  </Badge>
                  <span className="font-medium">{f.title}</span>
                </div>
                {f.body ? <p className="mt-1 text-fg-muted">{f.body}</p> : null}
                {f.dueDate ? (
                  <p className="mt-1 text-xs text-fg-subtle">Due {formatDate(f.dueDate)}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {open.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Open Cases (Severity First)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {open.map((o) => (
              <div key={o.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={o.severity} labels={settings.severityLabels} />
                  <Badge variant="muted">{o.category}</Badge>
                  <time className="text-xs text-fg-muted">{formatDateTime(o.date)}</time>
                </div>
                <p className="mt-1 font-semibold">{o.title}</p>
                <p className="mt-1 text-sm text-fg-muted whitespace-pre-wrap">{o.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Hits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {top.length === 0 ? (
            <p className="text-sm text-fg-muted">Nothing on File.</p>
          ) : (
            top.map((o, i) => (
              <div
                key={o.id}
                className="flex flex-wrap items-start gap-2 border-b border-border py-2 last:border-0"
              >
                <span className="w-6 font-mono text-sm text-fg-subtle">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={o.severity} labels={settings.severityLabels} />
                    <span className="font-medium">{o.title}</span>
                  </div>
                  <p className="text-xs text-fg-muted">
                    {formatDateTime(o.date)} · {o.category} · {o.status === "open" ? "Open" : o.status === "forgiven" ? "Forgiven" : o.status === "pattern" ? "Pattern" : o.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {closedDisputes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Dispute Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {closedDisputes.map((d) => (
              <div key={d.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {d.kind === "dispute" ? "Dispute" : d.kind === "appeal" ? "Appeal" : d.kind}
                  </Badge>
                  <Badge variant={d.status === "accepted" ? "success" : "danger"}>
                    {d.status === "accepted"
                      ? "Accepted"
                      : d.status === "rejected"
                        ? "Rejected"
                        : d.status}
                  </Badge>
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
        Generated {formatDateTime(new Date().toISOString())} · Private Ledger for{" "}
        {profile.trackerName} & {profile.subjectName}
      </p>
    </div>
  );
}
