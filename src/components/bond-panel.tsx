import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useLedger } from "@/lib/ledger-context";
import type { PerkKind } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function BondPanel() {
  const { bonds, categories, profile, role, createBond } = useLedger();
  const otherRole = role === "tracker" ? "subject" : "tracker";
  const otherName = otherRole === "subject" ? profile.subjectName : profile.trackerName;
  const [title, setTitle] = useState("Stay Clean — Perk On Ice");
  const [body, setBody] = useState("Keep This Category Clean. The Perk Drops When The Clock Runs.");
  const [kind, setKind] = useState<PerkKind>("favor");
  const [category, setCategory] = useState(categories[0] ?? "Chores & Mess");
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) return toast.error("Name The Bond.");
    setBusy(true);
    try {
      await createBond({ title: title.trim(), body: body.trim(), kind, category, days });
      toast.success(`Bond Escrowed For ${otherName.split(" ")[0]}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Escrow Bond");
    } finally {
      setBusy(false);
    }
  }

  const escrow = bonds.filter((b) => b.status === "escrow");
  const closed = bonds.filter((b) => b.status !== "escrow").slice(0, 6);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Good-Behavior Bond</CardTitle>
          <CardDescription>
            Park A Perk In Escrow For {otherName.split(" ")[0]}. Stay Clean In That Category Or It Burns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Perk They Get If They Stay Clean</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Details</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-16" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Category</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="field-control">
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Days Clean</Label>
              <Input
                type="number"
                min={3}
                max={90}
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || 14)}
              />
            </div>
            <div>
              <Label>Kind</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as PerkKind)}
                className="field-control"
              >
                <option value="favor">Favor</option>
                <option value="pass">Pass</option>
                <option value="date">Date</option>
                <option value="jail_pass">Jail Pass</option>
              </select>
            </div>
          </div>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Escrowing…" : "Escrow The Bond"}
          </Button>
        </CardContent>
      </Card>

      {escrow.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>On Ice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {escrow.map((b) => (
              <div key={b.id} className="rounded-xl border border-border bg-bg p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="warn">Escrow</Badge>
                  <Badge variant="outline">{b.category}</Badge>
                  <span className="text-xs text-fg-muted">Releases {formatDate(b.releasesOn)}</span>
                </div>
                <p className="mt-1 font-semibold text-fg">{b.title}</p>
                {b.body ? <p className="text-sm text-fg-muted">{b.body}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {closed.length > 0 ? (
        <ul className="space-y-2">
          {closed.map((b) => (
            <li key={b.id} className="rounded-xl border border-border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={b.status === "released" ? "success" : "danger"}>
                  {b.status === "released" ? "Released" : "Burned"}
                </Badge>
                <span className="text-sm font-medium text-fg">{b.title}</span>
                <span className="text-xs text-fg-subtle">{b.category}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
