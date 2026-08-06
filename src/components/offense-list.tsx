import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, Check, Gavel, Pencil, Search, Trash2, Undo2 } from "lucide-react";
import { EvidenceList, EvidencePicker } from "@/components/evidence-picker";
import { SeverityBadge, SeverityPicker } from "@/components/severity-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Dispute } from "@/lib/ledger";
import { useLedger } from "@/lib/ledger-context";
import type { EvidenceItem, Offense, OffenseStatus, Severity } from "@/lib/types";
import {
  centralLocalToIso,
  formatDateTime,
  isoToCentralDatetimeLocal,
} from "@/lib/utils";

type FilterSev = "all" | "1" | "2" | "3" | "4" | "5";
type FilterStatus = "all" | OffenseStatus;

export function OffenseList() {
  const {
    offenses,
    disputes,
    categories,
    role,
    profile,
    settings,
    email,
    deleteOffense,
    setStatus,
    updateOffense,
    submitDispute,
    resolveDispute,
    withdrawDispute,
  } = useLedger();

  const [query, setQuery] = useState("");
  const [sev, setSev] = useState<FilterSev>("all");
  const [status, setStatusFilter] = useState<FilterStatus>("all");
  const [category, setCategory] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Offense | null>(null);
  const [disputing, setDisputing] = useState<Offense | null>(null);
  const [resolving, setResolving] = useState<Dispute | null>(null);

  const disputesByOffense = useMemo(() => {
    const map = new Map<string, Dispute[]>();
    for (const d of disputes) {
      const list = map.get(d.offenseId) ?? [];
      list.push(d);
      map.set(d.offenseId, list);
    }
    return map;
  }, [disputes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...offenses]
      .filter((o) => {
        if (!showArchived && o.archived) return false;
        if (showArchived && !o.archived) return false;
        if (sev !== "all" && String(o.severity) !== sev) return false;
        if (status !== "all" && o.status !== status) return false;
        if (category !== "all" && o.category !== category) return false;
        if (!q) return true;
        const disputeText = (disputesByOffense.get(o.id) ?? [])
          .map((d) => `${d.body} ${d.response ?? ""}`)
          .join(" ")
          .toLowerCase();
        return (
          o.title.toLowerCase().includes(q) ||
          o.description.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q) ||
          o.impact.toLowerCase().includes(q) ||
          o.moods.join(" ").toLowerCase().includes(q) ||
          o.contexts.join(" ").toLowerCase().includes(q) ||
          disputeText.includes(q)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [offenses, query, sev, status, category, showArchived, disputesByOffense]);

  function isAuthor(o: Offense) {
    return (
      o.authorRole === role ||
      (email && o.authorEmail.toLowerCase() === email.toLowerCase())
    );
  }

  function canDispute(o: Offense) {
    return Boolean(role && !isAuthor(o));
  }

  function canEdit(o: Offense) {
    return isAuthor(o) || role === "tracker";
  }

  function nameForRole(r: string) {
    return r === "tracker" ? profile.trackerName.split(" ")[0] : profile.subjectName.split(" ")[0];
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete This Entry Permanently?")) return;
    try {
      await deleteOffense(id);
      toast.success("Entry Deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete Failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offense History</CardTitle>
        <CardDescription>
          Bidirectional Ledger — Both of You Log, Both of You Can Dispute What the Other Filed.{" "}
          {filtered.length} Shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            className="pl-9"
            placeholder="Search Titles, Notes, Moods, Disputes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["1", "1"],
              ["2", "2"],
              ["3", "3"],
              ["4", "4"],
              ["5", "5"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setSev(v)}
              className={`min-h-10 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                sev === v
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-bg-elevated text-fg-muted hover:bg-bg-subtle"
              }`}
            >
              {v === "all" ? "All Severities" : `Sev ${label}`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className={`min-h-10 rounded-full border px-3 py-2 text-xs font-medium ${
              showArchived
                ? "border-primary bg-primary-soft text-primary"
                : "border-border bg-bg-elevated text-fg-muted"
            }`}
          >
            {showArchived ? "Viewing Archive" : "Active Only"}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={status}
            onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
            className="field-control"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="forgiven">Forgiven</option>
            <option value="pattern">Pattern</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="field-control"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
            <p className="font-medium text-fg">No Matching Offenses</p>
            <p className="mt-1 text-sm text-fg-muted">
              {offenses.length === 0
                ? "The Ledger Is Clean. Log the Next One When It Happens."
                : "Try a Different Filter or Search."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((o) => {
              const itemDisputes = disputesByOffense.get(o.id) ?? [];
              const pending = itemDisputes.filter((d) => d.status === "pending");
              return (
                <li
                  key={o.id}
                  className="rounded-xl border border-border bg-bg p-4 transition-colors hover:border-border-strong"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={o.severity} labels={settings.severityLabels} />
                      <Badge variant="muted">{o.category}</Badge>
                      <Badge
                        variant={
                          o.status === "open"
                            ? "danger"
                            : o.status === "forgiven"
                              ? "success"
                              : "warn"
                        }
                      >
                        {o.status === "open" ? "Open" : o.status === "forgiven" ? "Forgiven" : o.status === "pattern" ? "Pattern" : o.status}
                      </Badge>
                      <Badge variant="outline">
                        {nameForRole(o.authorRole)} → {nameForRole(o.againstRole)}
                      </Badge>
                      {o.archived ? <Badge variant="muted">Archived</Badge> : null}
                      {pending.length > 0 ? (
                        <Badge variant="warn">
                          {pending.length} pending dispute{pending.length === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                      {o.remorse != null ? (
                        <Badge variant="default">Remorse {o.remorse}/5</Badge>
                      ) : null}
                    </div>
                    <time className="text-xs text-fg-muted tabular-nums">
                      {formatDateTime(o.date)}
                    </time>
                  </div>
                  <h4 className="mt-2 font-semibold text-fg">{o.title}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-fg-muted">{o.description}</p>
                  {o.impact ? (
                    <p className="mt-2 border-l-2 border-primary/30 pl-3 text-sm text-fg">
                      <span className="font-medium text-primary">Impact: </span>
                      {o.impact}
                    </p>
                  ) : null}
                  {(o.moods.length > 0 || o.contexts.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {o.moods.map((m) => (
                        <Badge key={m} variant="muted">
                          {m}
                        </Badge>
                      ))}
                      {o.contexts.map((m) => (
                        <Badge key={m} variant="outline">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <EvidenceList items={o.evidence} />

                  {itemDisputes.length > 0 ? (
                    <div className="mt-3 space-y-2 rounded-lg border border-border bg-bg-elevated p-3">
                      <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                        Disputes & Appeals
                      </p>
                      {itemDisputes.map((d) => (
                        <div key={d.id} className="rounded-md border border-border bg-bg p-3 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{d.kind === "dispute" ? "Dispute" : d.kind === "appeal" ? "Appeal" : d.kind}</Badge>
                            <Badge
                              variant={
                                d.status === "pending"
                                  ? "warn"
                                  : d.status === "accepted"
                                    ? "success"
                                    : d.status === "rejected"
                                      ? "danger"
                                      : "muted"
                              }
                            >
                              {d.status === "pending" ? "Pending" : d.status === "accepted" ? "Accepted" : d.status === "rejected" ? "Rejected" : d.status === "withdrawn" ? "Withdrawn" : d.status}
                            </Badge>
                            <span className="text-xs text-fg-subtle">
                              {nameForRole(d.authorRole)} · {formatDateTime(d.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-fg">{d.body}</p>
                          <EvidenceList items={d.evidence} />
                          {d.response ? (
                            <p className="mt-2 border-l-2 border-primary/40 pl-2 text-fg-muted">
                              <span className="font-medium text-primary">Ruling: </span>
                              {d.response}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {isAuthor(o) && d.status === "pending" ? (
                              <Button variant="soft" size="sm" onClick={() => setResolving(d)}>
                                <Gavel className="size-3.5" />
                                Rule on This
                              </Button>
                            ) : null}
                            {d.authorRole === role && d.status === "pending" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await withdrawDispute(d.id);
                                    toast.success("Dispute Withdrawn.");
                                  } catch (e) {
                                    toast.error(
                                      e instanceof Error ? e.message : "Withdraw Failed",
                                    );
                                  }
                                }}
                              >
                                Withdraw
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    {canDispute(o) ? (
                      <Button variant="soft" size="sm" onClick={() => setDisputing(o)}>
                        <Gavel className="size-3.5" />
                        Dispute / Appeal
                      </Button>
                    ) : null}
                    {canEdit(o) ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(o)}>
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        {o.status === "open" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              void setStatus(o.id, "forgiven").then(() =>
                                toast.success("Marked Forgiven."),
                              )
                            }
                          >
                            <Check className="size-3.5" />
                            Forgive
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void setStatus(o.id, "open")}
                          >
                            <Undo2 className="size-3.5" />
                            Reopen
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void updateOffense(o.id, { archived: !o.archived }).then(() =>
                              toast.success(o.archived ? "Unarchived." : "Archived."),
                            )
                          }
                        >
                          <Archive className="size-3.5" />
                          {o.archived ? "Unarchive" : "Archive"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger-soft hover:text-danger"
                          onClick={() => handleDelete(o.id)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        {editing ? (
          <EditForm
            key={editing.id}
            offense={editing}
            categories={categories}
            labels={settings.severityLabels}
            onClose={() => setEditing(null)}
            onSave={async (id, patch) => {
              try {
                await updateOffense(id, patch);
                setEditing(null);
                toast.success("Entry Updated.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Update Failed");
              }
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={Boolean(disputing)} onOpenChange={(v) => !v && setDisputing(null)}>
        {disputing ? (
          <DisputeForm
            offense={disputing}
            onClose={() => setDisputing(null)}
            onSubmit={async (kind, body, evidence) => {
              try {
                await submitDispute({ offenseId: disputing.id, kind, body, evidence });
                setDisputing(null);
                toast.success("Dispute Filed.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could Not File Dispute");
              }
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={Boolean(resolving)} onOpenChange={(v) => !v && setResolving(null)}>
        {resolving ? (
          <ResolveForm
            dispute={resolving}
            onClose={() => setResolving(null)}
            onResolve={async (status, response, forgiveOffense) => {
              try {
                await resolveDispute({
                  id: resolving.id,
                  status,
                  response,
                  forgiveOffense,
                });
                setResolving(null);
                toast.success(
                  status === "accepted" ? "Dispute accepted." : "Dispute rejected.",
                );
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Resolve Failed");
              }
            }}
          />
        ) : null}
      </Dialog>
    </Card>
  );
}

function EditForm({
  offense,
  categories,
  labels,
  onSave,
  onClose,
}: {
  offense: Offense;
  categories: string[];
  labels?: import("@/lib/types").SeverityLabels;
  onSave: (id: string, patch: Partial<Offense>) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(offense.title);
  const [description, setDescription] = useState(offense.description);
  const [impact, setImpact] = useState(offense.impact);
  const [severity, setSeverity] = useState<Severity>(offense.severity);
  const [category, setCategory] = useState(offense.category);
  const [status, setStatus] = useState<OffenseStatus>(offense.status);
  const [date, setDate] = useState(() => isoToCentralDatetimeLocal(offense.date));
  const [evidence, setEvidence] = useState<EvidenceItem[]>(offense.evidence);
  const [saving, setSaving] = useState(false);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit Offense</DialogTitle>
        <DialogDescription>Update the Record. Times Are Central.</DialogDescription>
      </DialogHeader>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        <div>
          <Label>When (Central)</Label>
          <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Severity</Label>
          <SeverityPicker value={severity} onChange={setSeverity} labels={labels} />
        </div>
        <div>
          <Label>Category</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="field-control"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OffenseStatus)}
            className="field-control"
          >
            <option value="open">Open</option>
            <option value="forgiven">Forgiven</option>
            <option value="pattern">Pattern</option>
          </select>
        </div>
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>What Happened</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label>Impact</Label>
          <Textarea
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            className="min-h-16"
          />
        </div>
        <div>
          <Label>Evidence</Label>
          <EvidencePicker value={evidence} onChange={setEvidence} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(offense.id, {
                  title: title.trim(),
                  description: description.trim(),
                  impact: impact.trim(),
                  severity,
                  category,
                  status,
                  date: centralLocalToIso(date),
                  evidence,
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function DisputeForm({
  offense,
  onClose,
  onSubmit,
}: {
  offense: Offense;
  onClose: () => void;
  onSubmit: (
    kind: "dispute" | "appeal",
    body: string,
    evidence: EvidenceItem[],
  ) => Promise<void>;
}) {
  const [kind, setKind] = useState<"dispute" | "appeal">("dispute");
  const [body, setBody] = useState("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [saving, setSaving] = useState(false);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Dispute or Appeal</DialogTitle>
        <DialogDescription>
          Challenge “{offense.title}”. Attach Counter-Evidence If You Have It.
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto">
        <div>
          <Label>Type</Label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as "dispute" | "appeal")}
            className="field-control"
          >
            <option value="dispute">Dispute (Facts Are Wrong / Incomplete)</option>
            <option value="appeal">Appeal (Severity or Outcome Unfair)</option>
          </select>
        </div>
        <div>
          <Label>Your Statement</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What Should Be Corrected, and Why?"
            className="min-h-28"
            required
          />
        </div>
        <div>
          <Label>Counter-Evidence</Label>
          <EvidencePicker value={evidence} onChange={setEvidence} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || !body.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                await onSubmit(kind, body.trim(), evidence);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Filing…" : "File Dispute"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function ResolveForm({
  dispute,
  onClose,
  onResolve,
}: {
  dispute: Dispute;
  onClose: () => void;
  onResolve: (
    status: "accepted" | "rejected",
    response: string,
    forgiveOffense: boolean,
  ) => Promise<void>;
}) {
  const [response, setResponse] = useState("");
  const [forgive, setForgive] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Rule on {dispute.kind === "appeal" ? "Appeal" : "Dispute"}</DialogTitle>
        <DialogDescription>Their Statement Is on the Record.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-bg p-3 text-sm text-fg">
          {dispute.body}
        </div>
        <EvidenceList items={dispute.evidence} />
        <div>
          <Label>Your Response (Optional)</Label>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="What You Decide, and Why."
            className="min-h-20"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={forgive}
            onChange={(e) => setForgive(e.target.checked)}
            className="size-4 rounded border-border"
          />
          If Accepted, Also Mark the Offense Forgiven
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onResolve("rejected", response.trim(), false);
              } finally {
                setSaving(false);
              }
            }}
          >
            Reject
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onResolve("accepted", response.trim(), forgive);
              } finally {
                setSaving(false);
              }
            }}
          >
            Accept
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
