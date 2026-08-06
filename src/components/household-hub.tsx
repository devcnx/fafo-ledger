import { useState } from "react";
import { toast } from "sonner";
import { Check, Heart, Pin, Quote, Scale, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useLedger } from "@/lib/ledger-context";
import type { AppRole } from "@/lib/roles";
import type { Severity } from "@/lib/types";
import { formatDate, formatDateTime, toLocalDatetimeValue, centralLocalToIso } from "@/lib/utils";

export function ApologiesPanel() {
  const { apologies, offenses, role, profile, submitApology, resolveApology } = useLedger();
  const [body, setBody] = useState("");
  const [remorse, setRemorse] = useState<Severity>(3);
  const [offenseId, setOffenseId] = useState("");
  const [saving, setSaving] = useState(false);

  const againstMe = offenses.filter((o) => o.againstRole === role && o.status === "open");

  async function submit() {
    if (!body.trim()) return toast.error("Write the Apology.");
    setSaving(true);
    try {
      await submitApology({
        body: body.trim(),
        remorse,
        offenseId: offenseId || null,
      });
      setBody("");
      setOffenseId("");
      toast.success("Apology Filed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Submit an Apology</CardTitle>
          <CardDescription>
            Own It. Remorse Meter 1–5. Partner Can Accept or Reject.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Linked Offense (Optional)</Label>
            <select
              value={offenseId}
              onChange={(e) => setOffenseId(e.target.value)}
              className="field-control"
            >
              <option value="">General Apology</option>
              {againstMe.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Remorse (1–5)</Label>
            <div className="mt-1 flex gap-1">
              {([1, 2, 3, 4, 5] as Severity[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRemorse(n)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold ${
                    remorse === n
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-bg-elevated text-fg-muted"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Apology</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What You Did, Why It Was Wrong, What You’ll Do Differently."
              className="min-h-24"
            />
          </div>
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Sending…" : "Send Apology"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apology Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {apologies.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">No Apologies Yet.</p>
          ) : (
            apologies.map((a) => {
              const name =
                a.authorRole === "tracker" ? profile.trackerName : profile.subjectName;
              const canResolve = a.status === "pending" && a.authorRole !== role;
              return (
                <div key={a.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{name.split(" ")[0]}</Badge>
                    <Badge variant="muted">Remorse {a.remorse}/5</Badge>
                    <Badge
                      variant={
                        a.status === "pending"
                          ? "warn"
                          : a.status === "accepted"
                            ? "success"
                            : "danger"
                      }
                    >
                      {a.status === "pending" ? "Pending" : a.status === "accepted" ? "Accepted" : a.status === "rejected" ? "Rejected" : a.status}
                    </Badge>
                    <span className="text-xs text-fg-subtle">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-fg">{a.body}</p>
                  {a.response ? (
                    <p className="mt-2 border-l-2 border-primary/40 pl-2 text-sm text-fg-muted">
                      Response: {a.response}
                    </p>
                  ) : null}
                  {canResolve ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          void resolveApology({
                            id: a.id,
                            status: "accepted",
                            forgiveOffense: Boolean(a.offenseId),
                          }).then(() => toast.success("Accepted."))
                        }
                      >
                        <Check className="size-3.5" />
                        Accept{a.offenseId ? " + Forgive" : ""}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void resolveApology({ id: a.id, status: "rejected" }).then(() =>
                            toast.message("Rejected."),
                          )
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ConsequencesPanel() {
  const {
    consequences,
    role,
    profile,
    addConsequence,
    updateConsequence,
    deleteConsequence,
  } = useLedger();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [triggerRule, setTriggerRule] = useState("");
  const [assignedToRole, setAssignedToRole] = useState<AppRole>(
    role === "tracker" ? "subject" : "tracker",
  );
  const [dueDate, setDueDate] = useState("");

  async function create() {
    if (!title.trim()) return toast.error("Title Required.");
    try {
      await addConsequence({
        title: title.trim(),
        description,
        triggerRule,
        assignedToRole,
        dueDate: dueDate || null,
      });
      setTitle("");
      setDescription("");
      setTriggerRule("");
      setDueDate("");
      toast.success("Consequence Added.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-5 text-primary" />
            Consequences Board
          </CardTitle>
          <CardDescription>
            Agreed “If X Then Y” Rules. Assigned Partner Clears Them When Done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g. Cook Dinner This Week"
            />
          </div>
          <div>
            <Label>If / When (Trigger)</Label>
            <Input
              value={triggerRule}
              onChange={(e) => setTriggerRule(e.target.value)}
              placeholder="If Late Without Text 2×…"
            />
          </div>
          <div>
            <Label>Details</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-16"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Assigned To</Label>
              <select
                value={assignedToRole}
                onChange={(e) => setAssignedToRole(e.target.value as AppRole)}
                className="field-control"
              >
                <option value="subject">{profile.subjectName}</option>
                <option value="tracker">{profile.trackerName}</option>
              </select>
            </div>
            <div>
              <Label>Due (Optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => void create()}>Add Consequence</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {consequences.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-fg-muted">
              Board Is Empty. Write the Rules Before Someone “Forgets.”
            </CardContent>
          </Card>
        ) : (
          consequences.map((c) => {
            const assignee =
              c.assignedToRole === "tracker" ? profile.trackerName : profile.subjectName;
            return (
              <Card key={c.id}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        c.status === "open" ? "warn" : c.status === "done" ? "success" : "muted"
                      }
                    >
                      {c.status === "open" ? "Open" : c.status === "done" ? "Done" : c.status === "cancelled" ? "Cancelled" : c.status}
                    </Badge>
                    <Badge variant="outline">→ {assignee.split(" ")[0]}</Badge>
                    {c.dueDate ? (
                      <span className="text-xs text-fg-muted">Due {formatDate(c.dueDate)}</span>
                    ) : null}
                  </div>
                  <h4 className="font-semibold text-fg">{c.title}</h4>
                  {c.triggerRule ? (
                    <p className="text-sm text-fg-muted">If: {c.triggerRule}</p>
                  ) : null}
                  {c.description ? (
                    <p className="text-sm text-fg-muted">{c.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-1">
                    {c.status === "open" ? (
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() =>
                          void updateConsequence(c.id, { status: "done" }).then(() =>
                            toast.success("Marked Done."),
                          )
                        }
                      >
                        Mark Done
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => void deleteConsequence(c.id)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export function CreditsPanel() {
  const { credits, role, profile, addCredit, resolveCredit } = useLedger();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aboutRole, setAboutRole] = useState<AppRole>(
    role === "tracker" ? "subject" : "tracker",
  );

  async function create() {
    if (!title.trim()) return toast.error("Title Required.");
    try {
      await addCredit({
        date: centralLocalToIso(toLocalDatetimeValue()),
        title: title.trim(),
        description,
        aboutRole,
      });
      setTitle("");
      setDescription("");
      toast.success("Credit Logged.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="size-5 text-primary" />
            Love / Credit Ledger
          </CardTitle>
          <CardDescription>
            Soften the Roast with Receipts for Good Deeds. Credited Person Accepts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Who Gets the Credit?</Label>
            <select
              value={aboutRole}
              onChange={(e) => setAboutRole(e.target.value as AppRole)}
              className="field-control"
            >
              <option value="subject">{profile.subjectName}</option>
              <option value="tracker">{profile.trackerName}</option>
            </select>
          </div>
          <div>
            <Label>What They Did</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Details</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-16"
            />
          </div>
          <Button onClick={() => void create()}>Log Good Deed</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {credits.map((c) => {
          const about =
            c.aboutRole === "tracker" ? profile.trackerName : profile.subjectName;
          const canResolve = c.status === "pending" && c.aboutRole === role;
          return (
            <Card key={c.id}>
              <CardContent className="space-y-2 pt-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">For {about.split(" ")[0]}</Badge>
                  <Badge
                    variant={
                      c.status === "pending"
                        ? "warn"
                        : c.status === "accepted"
                          ? "success"
                          : "danger"
                    }
                  >
                    {c.status === "pending"
                      ? "Pending"
                      : c.status === "accepted"
                        ? "Accepted"
                        : c.status === "rejected"
                          ? "Rejected"
                          : c.status}
                  </Badge>
                  <span className="text-xs text-fg-subtle">{formatDateTime(c.date)}</span>
                </div>
                <p className="font-semibold">{c.title}</p>
                {c.description ? (
                  <p className="text-sm text-fg-muted">{c.description}</p>
                ) : null}
                {canResolve ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        void resolveCredit({ id: c.id, status: "accepted" }).then(() =>
                          toast.success("Accepted."),
                        )
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void resolveCredit({ id: c.id, status: "rejected" })}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function QuotesPanel() {
  const { quotes, profile, addQuote, updateQuote, deleteQuote } = useLedger();
  const [quoteText, setQuoteText] = useState("");
  const [context, setContext] = useState("");
  const [saidByRole, setSaidByRole] = useState<AppRole>("subject");

  async function create() {
    if (!quoteText.trim()) return toast.error("Need a Quote.");
    try {
      await addQuote({ quoteText: quoteText.trim(), saidByRole, context, pinned: false });
      setQuoteText("");
      setContext("");
      toast.success("Pinned to the Wall… Well, Added.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Quote className="size-5 text-primary" />
            Quotes Wall
          </CardTitle>
          <CardDescription>Best (Worst) Lines — Forever Evidence.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Said By</Label>
            <select
              value={saidByRole}
              onChange={(e) => setSaidByRole(e.target.value as AppRole)}
              className="field-control"
            >
              <option value="subject">{profile.subjectName}</option>
              <option value="tracker">{profile.trackerName}</option>
            </select>
          </div>
          <div>
            <Label>Quote</Label>
            <Textarea value={quoteText} onChange={(e) => setQuoteText(e.target.value)} />
          </div>
          <div>
            <Label>Context</Label>
            <Input value={context} onChange={(e) => setContext(e.target.value)} />
          </div>
          <Button onClick={() => void create()}>Add Quote</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {quotes.map((q) => {
          const who = q.saidByRole === "tracker" ? profile.trackerName : profile.subjectName;
          return (
            <Card key={q.id} className={q.pinned ? "border-primary/40" : undefined}>
              <CardContent className="pt-4">
                <blockquote className="font-display text-lg font-medium text-fg">
                  “{q.quoteText}”
                </blockquote>
                <p className="mt-2 text-sm text-fg-muted">
                  — {who}
                  {q.context ? ` · ${q.context}` : ""}
                </p>
                <div className="mt-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void updateQuote(q.id, { pinned: !q.pinned })}
                  >
                    <Pin className="size-3.5" />
                    {q.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => void deleteQuote(q.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function CaseFilePanel() {
  const { offenses, disputes, apologies, role, profile } = useLedger();
  if (!role) return null;
  const againstMe = offenses.filter((o) => !o.archived && o.againstRole === role);
  const myDisputes = disputes.filter((d) => d.authorRole === role);
  const myApologies = apologies.filter((a) => a.authorRole === role);
  const open = againstMe.filter((o) => o.status === "open");
  const lessons = againstMe
    .filter((o) => o.status === "forgiven" || o.severity >= 4)
    .slice(0, 12);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Case File</CardTitle>
          <CardDescription>
            {role === "subject" ? profile.subjectName : profile.trackerName} — what's on you,
            your disputes, and what not to do again.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Mini label="Open Against You" value={String(open.length)} />
          <Mini label="Your Disputes" value={String(myDisputes.length)} />
          <Mini
            label="Won"
            value={String(myDisputes.filter((d) => d.status === "accepted").length)}
          />
          <Mini label="Apologies Sent" value={String(myApologies.length)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Against You</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {open.length === 0 ? (
            <p className="text-sm text-fg-muted">Clean Slate on Open Cases.</p>
          ) : (
            open.map((o) => (
              <div key={o.id} className="rounded-lg border border-border p-3">
                <p className="font-semibold">{o.title}</p>
                <p className="text-xs text-fg-muted">
                  Sev {o.severity} · {o.category} · {formatDateTime(o.date)}
                </p>
                <p className="mt-1 text-sm text-fg-muted">{o.description}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Things Not to Do Again</CardTitle>
          <CardDescription>High Severity + Forgiven History.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {lessons.length === 0 ? (
            <p className="text-sm text-fg-muted">No Lessons Filed Yet. Keep It That Way.</p>
          ) : (
            lessons.map((o) => (
              <div key={o.id} className="rounded-lg border border-border bg-bg-subtle px-3 py-2 text-sm">
                <span className="font-medium text-fg">{o.title}</span>
                <span className="text-fg-muted"> — {o.category}, sev {o.severity}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="font-display text-xl font-semibold text-primary tabular-nums">{value}</div>
      <div className="text-[10px] font-medium tracking-wide text-fg-muted uppercase">{label}</div>
    </div>
  );
}
