import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Gavel, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { BargainBlock } from "@/components/bargain-block";
import { FIND_OUT_SUGGESTIONS, PERK_SUGGESTIONS } from "@/lib/constants";
import {
  addCentralDays,
  findOutBadgeVariant,
  findOutStatusLabel,
  isFindOutOpen,
  isFindOutOverdue,
} from "@/lib/find-out";
import { useLedger } from "@/lib/ledger-context";
import type { FindOut, Severity } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const STEPS = [
  { n: "1", title: "Log The FA", body: "File What They Did. Receipts Optional. Attitude Not." },
  { n: "2", title: "Issue The FO", body: "Name The Sentence. Due Date. No Wiggle Room." },
  { n: "3", title: "They See It", body: "Warrant On Every Screen. Notification. No Hiding." },
  { n: "4", title: "Acknowledge", body: "They Tap I Found Out. Ignoring It Is More FA." },
  { n: "5", title: "Serve Or Else", body: "They Serve It, Appeal It, Or You Escalate." },
  { n: "6", title: "Repeat Tax", body: "They Do It Again: Perk Burns. FO Gets Worse. No Diary Path." },
];

export function FindOutPanel() {
  const { findOuts, offenses, perks, profile, role, issueFindOut, resolveFindOut, grantPerk, amnestyOn, useAmnesty } =
    useLedger();
  const otherRole = role === "tracker" ? "subject" : "tracker";
  const otherName = otherRole === "subject" ? profile.subjectName : profile.trackerName;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState(addCentralDays(7));
  const [offenseId, setOffenseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [appealNote, setAppealNote] = useState<Record<string, string>>({});

  const mine = useMemo(
    () => findOuts.filter((f) => f.assignedToRole === role),
    [findOuts, role],
  );
  const issuedByMe = useMemo(
    () => findOuts.filter((f) => f.issuedByRole === role),
    [findOuts, role],
  );
  const outstanding = findOuts.filter(isFindOutOpen);
  const overdue = outstanding.filter(isFindOutOverdue);
  const myOpen = mine.filter(isFindOutOpen);
  const openOffenses = offenses.filter((o) => o.status === "open" && !o.archived);

  async function issue() {
    if (!title.trim()) return toast.error("Name The Find Out.");
    setBusy(true);
    try {
      await issueFindOut({
        title: title.trim(),
        body: body.trim(),
        dueDate: dueDate || null,
        offenseId: offenseId || null,
      });
      setTitle("");
      setBody("");
      setOffenseId("");
      toast.success("Find Out Issued. They Have Been Served Notice.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Issue Find Out");
    } finally {
      setBusy(false);
    }
  }

  function applySuggestion(sev: Severity, idx: number) {
    const s = FIND_OUT_SUGGESTIONS[sev][idx];
    if (!s) return;
    setTitle(s.title);
    setBody(s.body);
    setDueDate(addCentralDays(s.dueDays));
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/30">
        <div className="bg-primary px-5 py-5 text-primary-fg sm:px-6">
          <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-80">
            The Find Out
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            Fuck Around Has A Bill.
          </h2>
          <p className="mt-2 max-w-xl text-sm opacity-90">
            Logging It Is the FA. This Tab Is the FO. Issue a Sentence. They Acknowledge. They
            Serve It — Or It Escalates.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="border-0 bg-primary-fg/15 text-primary-fg">
              {outstanding.length} Outstanding
            </Badge>
            <Badge className="border-0 bg-primary-fg/15 text-primary-fg">
              {overdue.length} Overdue
            </Badge>
            <Badge className="border-0 bg-primary-fg/15 text-primary-fg">
              {findOuts.filter((f) => f.status === "served").length} Served
            </Badge>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How FAFO Works</CardTitle>
          <CardDescription>Five Steps. The Last Three Are the FO Your Coworker Wanted.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="rounded-xl border border-border bg-bg-subtle px-3 py-3"
              >
                <p className="font-display text-lg font-semibold text-primary">{s.n}</p>
                <p className="mt-0.5 text-sm font-semibold text-fg">{s.title}</p>
                <p className="mt-1 text-xs leading-snug text-fg-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {myOpen.length > 0 ? (
        <Card className="border-warn">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warn">
              <Siren className="size-5" />
              You Found Out
            </CardTitle>
            <CardDescription>
              These Are Yours. Acknowledge, Then Serve. Ignoring This Is More FA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myOpen.map((f) => (
              <FindOutCard
                key={f.id}
                f={f}
                role={role}
                profile={profile}
                offenses={offenses}
                appealNote={appealNote[f.id] ?? ""}
                onAppealNote={(v) => setAppealNote((prev) => ({ ...prev, [f.id]: v }))}
                resolveFindOut={resolveFindOut}
                grantPerk={grantPerk}
                alreadyGranted={perks.some((p) => p.sourceId === f.id)}
                amnestyOn={amnestyOn}
                useAmnesty={useAmnesty}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="size-5 text-primary" />
            Issue A Find Out
          </CardTitle>
          <CardDescription>
            Against {otherName.split(" ")[0]}. Suggested Sentences Scale With Severity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Quick Sentences</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {([1, 2, 3, 4, 5] as Severity[]).flatMap((sev) =>
                FIND_OUT_SUGGESTIONS[sev].map((s, i) => (
                  <button
                    key={`${sev}-${i}`}
                    type="button"
                    onClick={() => applySuggestion(sev, i)}
                    className="inline-flex min-h-9 items-center rounded-full border border-border bg-bg-elevated px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-primary hover:text-primary"
                  >
                    Sev {sev}: {s.title}
                  </button>
                )),
              )}
            </div>
          </div>
          <div>
            <Label>Linked Offense (Optional)</Label>
            <select
              value={offenseId}
              onChange={(e) => setOffenseId(e.target.value)}
              className="field-control"
            >
              <option value="">Standalone Find Out</option>
              {openOffenses.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>The Sentence</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What They Have To Do"
            />
          </div>
          <div>
            <Label>Details</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Spell Out The Find Out. No Wiggle Room."
              className="min-h-20"
            />
          </div>
          <div>
            <Label>Due (Central)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <Button onClick={() => void issue()} disabled={busy} className="w-full sm:w-auto">
            {busy ? "Issuing…" : `Serve Notice To ${otherName.split(" ")[0]}`}
          </Button>
        </CardContent>
      </Card>

      {findOuts.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-fg-muted">
            No Find Outs Yet. The Ledger Has FA Without FO — Issue One.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h3 className="px-1 text-sm font-semibold tracking-wide text-fg-muted uppercase">
            The Docket
          </h3>
          <ul className="space-y-3">
            {findOuts.map((f) => (
              <li key={f.id}>
                <FindOutCard
                  f={f}
                  role={role}
                  profile={profile}
                  offenses={offenses}
                  appealNote={appealNote[f.id] ?? ""}
                  onAppealNote={(v) => setAppealNote((prev) => ({ ...prev, [f.id]: v }))}
                  resolveFindOut={resolveFindOut}
                  grantPerk={grantPerk}
                  alreadyGranted={perks.some((p) => p.sourceId === f.id)}
                  amnestyOn={amnestyOn}
                  useAmnesty={useAmnesty}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {issuedByMe.filter(isFindOutOpen).length === 0 && mine.length === 0 && findOuts.length > 0 ? (
        <p className="text-center text-xs text-fg-subtle">All Caught Up On The Docket.</p>
      ) : null}
    </div>
  );
}

function FindOutCard({
  f,
  role,
  profile,
  offenses,
  appealNote,
  onAppealNote,
  resolveFindOut,
  grantPerk,
  alreadyGranted,
  amnestyOn,
  useAmnesty,
}: {
  f: FindOut;
  role: "tracker" | "subject" | null;
  profile: { trackerName: string; subjectName: string };
  offenses: { id: string; title: string }[];
  appealNote: string;
  onAppealNote: (v: string) => void;
  resolveFindOut: (input: {
    id: string;
    action: "acknowledge" | "serve" | "waive" | "appeal" | "escalate";
    note?: string;
  }) => Promise<void>;
  grantPerk: (input: {
    title: string;
    body?: string;
    kind?: import("@/lib/types").PerkKind;
    source?: "manual" | "fo_served";
    sourceId?: string | null;
    expiresOn?: string | null;
  }) => Promise<void>;
  alreadyGranted: boolean;
  amnestyOn: string | null;
  useAmnesty: (id: string) => Promise<void>;
}) {
  const assignee = f.assignedToRole === "tracker" ? profile.trackerName : profile.subjectName;
  const issuer = f.issuedByRole === "tracker" ? profile.trackerName : profile.subjectName;
  const offense = offenses.find((o) => o.id === f.offenseId);
  const mineItem = f.assignedToRole === role;
  const iIssued = f.issuedByRole === role;
  const late = isFindOutOverdue(f);

  return (
    <Card className={late ? "border-danger" : undefined}>
      <CardContent className="space-y-2 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={findOutBadgeVariant(f)}>
            {late && f.status !== "served" ? "Overdue" : findOutStatusLabel(f.status)}
          </Badge>
          {f.repeatCount >= 2 ? (
            <Badge variant="danger">Repeat Tax ×{f.repeatCount}</Badge>
          ) : null}
          <Badge variant="outline">→ {assignee.split(" ")[0]}</Badge>
          <span className="text-xs text-fg-subtle">Issued By {issuer.split(" ")[0]}</span>
          {f.dueDate ? (
            <span className="text-xs text-fg-muted">Due {formatDate(f.dueDate)}</span>
          ) : null}
        </div>
        <h4 className="font-semibold text-fg">{f.title}</h4>
        {f.body ? <p className="whitespace-pre-wrap text-sm text-fg-muted">{f.body}</p> : null}
        {offense ? <p className="text-xs text-fg-subtle">Linked FA: {offense.title}</p> : null}
        {f.escalationNote ? (
          <p className="border-l-2 border-primary/40 pl-3 text-sm text-fg">Note: {f.escalationNote}</p>
        ) : null}

        {amnestyOn && (f.status === "issued" || f.status === "acknowledged" || f.status === "appealed") ? (
          <Button
            size="sm"
            variant="soft"
            onClick={() =>
              void useAmnesty(f.id).then(() => toast.success("Amnesty Used. Find Out Waived."))
            }
          >
            Use Anniversary Amnesty
          </Button>
        ) : null}

        {(mineItem || iIssued) && (f.status === "issued" || f.status === "acknowledged" || f.status === "appealed") ? (
          <BargainBlock findOutId={f.id} mineItem={mineItem} iIssued={iIssued} />
        ) : null}

        <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-wrap">
          {mineItem && f.status === "issued" ? (
            <Button
              size="sm"
              variant="soft"
              onClick={() =>
                void resolveFindOut({ id: f.id, action: "acknowledge" }).then(() =>
                  toast.success("Acknowledged. Now Serve It."),
                )
              }
            >
              I Found Out
            </Button>
          ) : null}
          {mineItem && (f.status === "issued" || f.status === "acknowledged") ? (
            <Button
              size="sm"
              onClick={() =>
                void resolveFindOut({ id: f.id, action: "serve" }).then(() =>
                  toast.success("Marked Served."),
                )
              }
            >
              I Served It
            </Button>
          ) : null}
          {iIssued && f.status !== "served" && f.status !== "waived" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void resolveFindOut({ id: f.id, action: "serve" }).then(() =>
                  toast.success("Marked Served."),
                )
              }
            >
              Mark Served
            </Button>
          ) : null}
          {iIssued && f.status !== "served" && f.status !== "waived" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void resolveFindOut({ id: f.id, action: "waive" }).then(() =>
                  toast.success(f.status === "appealed" ? "Appeal Accepted. Waived." : "Waived."),
                )
              }
            >
              {f.status === "appealed" ? "Accept Appeal" : "Waive"}
            </Button>
          ) : null}
          {iIssued && f.status !== "served" && f.status !== "waived" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void resolveFindOut({
                  id: f.id,
                  action: "escalate",
                  note:
                    f.status === "appealed"
                      ? "Appeal Denied. The Find Out Got Worse."
                      : "Escalated. The Find Out Got Worse.",
                }).then(() =>
                  toast.success(
                    f.status === "appealed"
                      ? "Appeal Denied. Due Date Extended."
                      : "Escalated. Due Date Extended.",
                  ),
                )
              }
            >
              {f.status === "appealed" ? "Deny Appeal" : "Escalate"}
            </Button>
          ) : null}
        </div>
        {mineItem && (f.status === "issued" || f.status === "acknowledged") ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Appeal Note"
              value={appealNote}
              onChange={(e) => onAppealNote(e.target.value)}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void resolveFindOut({
                  id: f.id,
                  action: "appeal",
                  note: appealNote || "Appealed.",
                }).then(() => toast.success("Appeal Filed."))
              }
            >
              Appeal
            </Button>
          </div>
        ) : null}

        {iIssued && f.status === "served" ? (
          <div className="rounded-lg border border-success/30 bg-success-soft/40 p-3">
            <p className="text-xs font-semibold tracking-wide text-success uppercase">
              {alreadyGranted ? "Perk Already Granted" : "They Served It. Grant A Perk."}
            </p>
            {!alreadyGranted ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PERK_SUGGESTIONS.filter((s) => s.kind === "jail_pass" || s.kind === "favor").slice(0, 4).map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() =>
                      void grantPerk({
                        title: s.title,
                        body: s.body,
                        kind: s.kind,
                        source: "fo_served",
                        sourceId: f.id,
                        expiresOn: addCentralDays(s.expiresDays),
                      }).then(() => toast.success("Perk Banked."))
                    }
                    className="inline-flex min-h-9 items-center rounded-full border border-border bg-bg-elevated px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:border-primary hover:text-primary"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
