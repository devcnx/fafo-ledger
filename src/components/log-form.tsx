import { useMemo, useState } from "react";
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

function toggle<T>(list: T[], item: T, set: (v: T[]) => void) {
  set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
}

export function LogForm({ onLogged }: { onLogged?: () => void }) {
  const { addOffense, categories, profile, role, settings, templates } = useLedger();
  const againstRole = role === "tracker" ? "subject" : "tracker";
  const otherName =
    againstRole === "subject" ? profile.subjectName : profile.trackerName;

  const [date, setDate] = useState(toLocalDatetimeValue());
  const [severity, setSeverity] = useState<Severity>(3);
  const [category, setCategory] = useState(categories[0] ?? "Other");
  const [customCat, setCustomCat] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [contexts, setContexts] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [remorse, setRemorse] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  const usableTemplates = useMemo(
    () =>
      templates.filter(
        (t) => t.ownerRole === "both" || t.ownerRole === role || !t.ownerRole,
      ),
    [templates, role],
  );

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTitle(t.title);
    setDescription(t.description || "");
    setImpact(t.impact || "");
    setSeverity(t.severity);
    if (t.category) setCategory(t.category);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalCategory = customCat.trim() || category;
    if (!title.trim()) {
      toast.error("Give This a Short Title.");
      return;
    }
    if (!description.trim()) {
      toast.error("Write What Happened — Receipts Matter.");
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
      toast.success("Logged. Receipt Filed.");
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
      toast.error(err instanceof Error ? err.message : "Could Not Save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log An Offense</CardTitle>
        <CardDescription>
          Document What <strong>{otherName.split(" ")[0]}</strong> Did. Both Of You Can Log. They
          Can Dispute. Times Are Central.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {usableTemplates.length > 0 ? (
            <div>
              <Label>Quick Templates</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {usableTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border bg-bg-elevated px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-primary hover:text-primary"
                  >
                    <Zap className="size-3 shrink-0" />
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
              <Label htmlFor="custom-cat">Or New Category</Label>
              <Input
                id="custom-cat"
                placeholder="E.g. Socks On The Floor"
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Headline</Label>
            <Input
              id="title"
              placeholder="One-Line Summary Of The Crime"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div>
            <Label htmlFor="desc">What Happened</Label>
            <Textarea
              id="desc"
              placeholder="Facts Only. Who, What, When, How."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="impact">How It Got You (Optional)</Label>
            <Textarea
              id="impact"
              placeholder="How It Made You Feel / What It Cost You"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              className="min-h-16"
            />
          </div>

          <div>
            <Label>Your Mood (Optional)</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggle(moods, m, setMoods)}
                  className={`min-h-9 rounded-full border px-2.5 py-1.5 text-xs font-medium ${
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
            <Label>Context Tags (Optional)</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CONTEXT_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggle(contexts, m, setContexts)}
                  className={`min-h-9 rounded-full border px-2.5 py-1.5 text-xs font-medium ${
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
            <Label>Evidence / Receipts</Label>
            <EvidencePicker value={evidence} onChange={setEvidence} />
          </div>

          <div>
            <Label htmlFor="remorse">If You're Admitting Fault — Remorse (1–5, Optional)</Label>
            <select
              id="remorse"
              value={remorse}
              onChange={(e) => setRemorse(e.target.value === "" ? "" : Number(e.target.value))}
              className="field-control"
            >
              <option value="">Not Applicable</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            <Plus className="size-4" />
            {saving ? "Saving…" : `Add To Ledger (Against ${otherName.split(" ")[0]})`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
