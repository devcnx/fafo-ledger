import { useState } from "react";
import { toast } from "sonner";
import { Plus, Zap } from "lucide-react";
import { EvidencePicker } from "@/components/evidence-picker";
import { SeverityPicker } from "@/components/severity-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { CONTEXT_OPTIONS, MOOD_OPTIONS } from "@/lib/constants";
import { useLedger } from "@/lib/ledger-context";
import type { EvidenceItem, Severity } from "@/lib/types";
import { centralLocalToIso, toLocalDatetimeValue } from "@/lib/utils";

export function LogForm({ onLogged }: { onLogged?: () => void }) {
  const { addOffense, categories, profile, role, templates, settings } = useLedger();
  const otherName =
    role === "tracker" ? profile.subjectName : role === "subject" ? profile.trackerName : "them";
  const againstRole = role === "tracker" ? "subject" : "tracker";

  const [date, setDate] = useState(() => toLocalDatetimeValue());
  const [severity, setSeverity] = useState<Severity>(3);
  const [category, setCategory] = useState(categories[0] ?? "Communication");
  const [customCat, setCustomCat] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [contexts, setContexts] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [remorse, setRemorse] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const usableTemplates = templates.filter(
    (t) => t.ownerRole === "both" || t.ownerRole === role,
  );

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTitle(t.title);
    setCategory(t.category);
    setSeverity(t.severity as Severity);
    setDescription(t.description);
    setImpact(t.impact);
  }

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalCategory = customCat.trim() || category;
    if (!title.trim()) {
      toast.error("Give this a short title.");
      return;
    }
    if (!description.trim()) {
      toast.error("Write what happened — receipts matter.");
      return;
    }
    setSaving(true);
    try {
      await addOffense({
        date: centralLocalToIso(date),
        severity,
        category: finalCategory,
        title: title.trim(),
        description: description.trim(),
        impact: impact.trim(),
        moods,
        contexts,
        evidence,
        remorse: remorse === "" ? null : Number(remorse),
        againstRole,
      });
      toast.success("Logged. Receipt filed.");
      setTitle("");
      setDescription("");
      setImpact("");
      setCustomCat("");
      setSeverity(3);
      setMoods([]);
      setContexts([]);
      setEvidence([]);
      setRemorse("");
      setDate(toLocalDatetimeValue());
      onLogged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log an offense</CardTitle>
        <CardDescription>
          Document what <strong>{otherName.split(" ")[0]}</strong> did. Both of you can log. They
          can dispute. Times are Central.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {usableTemplates.length > 0 ? (
            <div>
              <Label>Quick templates</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {usableTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-primary hover:text-primary"
                  >
                    <Zap className="size-3" />
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <Label htmlFor="when">When (Central)</Label>
            <Input
              id="when"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Severity</Label>
            <SeverityPicker
              value={severity}
              onChange={setSeverity}
              labels={settings.severityLabels}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-bg-elevated px-3 text-sm text-fg shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="custom-cat">Or new category</Label>
              <Input
                id="custom-cat"
                placeholder="e.g. Socks on the floor"
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Headline</Label>
            <Input
              id="title"
              placeholder="One-line summary of the crime"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div>
            <Label htmlFor="desc">What happened</Label>
            <Textarea
              id="desc"
              placeholder="Facts only. Who, what, when, how."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="impact">How it got you (optional)</Label>
            <Textarea
              id="impact"
              placeholder="How it made you feel / what it cost you"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              className="min-h-16"
            />
          </div>

          <div>
            <Label>Your mood (optional)</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggle(moods, m, setMoods)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    moods.includes(m)
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-bg-elevated text-fg-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Context tags (optional)</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CONTEXT_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggle(contexts, m, setContexts)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    contexts.includes(m)
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-bg-elevated text-fg-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Evidence / receipts</Label>
            <EvidencePicker value={evidence} onChange={setEvidence} />
          </div>

          <div>
            <Label htmlFor="remorse">If you're admitting fault — remorse (1–5, optional)</Label>
            <select
              id="remorse"
              value={remorse}
              onChange={(e) => setRemorse(e.target.value === "" ? "" : Number(e.target.value))}
              className="flex h-10 w-full rounded-lg border border-border bg-bg-elevated px-3 text-sm"
            >
              <option value="">Not applicable</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            <Plus className="size-4" />
            {saving ? "Saving…" : `Add to ledger (against ${otherName.split(" ")[0]})`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
