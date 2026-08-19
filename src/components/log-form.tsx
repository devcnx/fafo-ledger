import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Sparkles, Zap } from "lucide-react";
import { EvidencePicker } from "@/components/evidence-picker";
import { SeverityPicker } from "@/components/severity-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { FIND_OUT_SUGGESTIONS, CONTEXT_OPTIONS, MOOD_OPTIONS } from "@/lib/constants";
import { draftWarrant } from "@/lib/draft-warrant";
import { addCentralDays } from "@/lib/find-out";
import {
  COOLING_SEVERITY,
  activeParoles,
  bondsAtRisk,
  coolingStorageKey,
  isTruceActive,
} from "@/lib/house-economy";
import { useLedger } from "@/lib/ledger-context";
import {
  countCategoryRepeats,
  hasOpenFindOut,
  pickPerkToBurn,
  upgradeSeverity,
} from "@/lib/repeat-tax";
import type { EvidenceItem, Severity } from "@/lib/types";
import { centralLocalToIso, toLocalDatetimeValue } from "@/lib/utils";

function toggle<T>(list: T[], item: T, set: (v: T[]) => void) {
  set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
}

export function LogForm({ onLogged }: { onLogged?: (result: { findOut: boolean }) => void }) {
  const {
    addOffense,
    categories,
    profile,
    role,
    settings,
    templates,
    offenses,
    findOuts,
    perks,
    bonds,
    paroles,
    truceUntil,
    truceNote,
  } = useLedger();
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
  const [foTitle, setFoTitle] = useState("");
  const [foBody, setFoBody] = useState("");
  const [foDue, setFoDue] = useState("");
  const [includeFo, setIncludeFo] = useState(true);
  const [foCustomized, setFoCustomized] = useState(false);
  const [coolUntil, setCoolUntil] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const [drafting, setDrafting] = useState(false);

  const finalCategoryPreview = customCat.trim() || category;
  const priorRepeats = countCategoryRepeats(offenses, finalCategoryPreview, againstRole);
  const nextRepeat = priorRepeats + 1;
  const outstandingFo = hasOpenFindOut(findOuts, againstRole);
  const paroleHits = activeParoles(paroles, againstRole, finalCategoryPreview);
  const bondHits = bondsAtRisk(bonds, againstRole, finalCategoryPreview);
  const willTax = nextRepeat >= 2 || outstandingFo;
  const mustFo = nextRepeat >= 2 || paroleHits.length > 0;
  const perkAtRisk = willTax ? pickPerkToBurn(perks, againstRole) : null;
  const taxSeverity = upgradeSeverity(severity, nextRepeat);
  const truceOn = isTruceActive(truceUntil);
  const coolingMs = (settings.coolingOffMinutes || 0) * 60_000;
  const needsCool = severity >= COOLING_SEVERITY && coolingMs > 0;
  const coolLeft = Math.max(0, coolUntil - nowTs);
  const cooling = needsCool && coolLeft > 0;

  useEffect(() => {
    if (!needsCool) {
      setCoolUntil(0);
      return;
    }
    try {
      const raw = localStorage.getItem(coolingStorageKey());
      const parsed = raw ? (JSON.parse(raw) as { until?: number; severity?: number }) : null;
      if (parsed?.until && parsed.until > Date.now() && (parsed.severity ?? 4) >= COOLING_SEVERITY) {
        setCoolUntil(parsed.until);
        return;
      }
    } catch {
      /* ignore */
    }
    const until = Date.now() + coolingMs;
    setCoolUntil(until);
    localStorage.setItem(coolingStorageKey(), JSON.stringify({ until, severity }));
  }, [needsCool, coolingMs, severity]);

  useEffect(() => {
    if (!cooling) return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [cooling]);

  useEffect(() => {
    if (foCustomized) return;
    const s = FIND_OUT_SUGGESTIONS[taxSeverity][0];
    if (!s) return;
    setFoTitle(s.title);
    setFoBody(s.body);
    setFoDue(addCentralDays(s.dueDays));
  }, [taxSeverity, foCustomized]);


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

  useEffect(() => {
    const id = sessionStorage.getItem("fafo-quick-tpl");
    if (!id) return;
    sessionStorage.removeItem("fafo-quick-tpl");
    applyTemplate(id);
  }, [templates]);

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
    if ((includeFo || mustFo) && !foTitle.trim()) {
      toast.error("Name The Find Out — Repeats Cannot Skip The Bill.");
      return;
    }
    if (truceOn) {
      toast.error(`Truce Is On Until ${truceUntil}. Logging Is Frozen.`);
      return;
    }
    if (cooling) {
      toast.error("Cooling Off. Severity 4–5 Waits.");
      return;
    }
    setSaving(true);
    try {
      const result = await addOffense({
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
        findOut:
          (includeFo || mustFo) && foTitle.trim()
            ? { title: foTitle.trim(), body: foBody.trim(), dueDate: foDue || null }
            : undefined,
      });
      const issuedFo = Boolean(result.findOutIssued ?? ((includeFo || mustFo) && foTitle.trim()));
      if (result.perkBurned) {
        toast.success(`Logged. Repeat Tax. Perk Burned: ${result.perkBurned}.`);
      } else if (result.bondBurned) {
        toast.success(`Logged. Bond Burned: ${result.bondBurned}.`);
      } else if (result.paroleViolation) {
        toast.success("Logged. Parole Violation. FO Hits Harder.");
      } else if ((result.repeatCount ?? 1) >= 2) {
        toast.success("Logged. Repeat Tax Issued. FO Got Worse.");
      } else {
        toast.success(issuedFo ? "Logged. Find Out Issued." : "Logged. Receipt Filed.");
      }
      onLogged?.({ findOut: issuedFo || Boolean(result.findOutIssued) });
      localStorage.removeItem(coolingStorageKey());
      setCoolUntil(0);
      setTitle("");
      setDescription("");
      setImpact("");
      setCustomCat("");
      setSeverity(3);
      setMoods([]);
      setContexts([]);
      setEvidence([]);
      setRemorse("");
      setFoCustomized(false);
      setFoTitle("");
      setFoBody("");
      setFoDue("");
      setDate(toLocalDatetimeValue());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could Not Save");
    } finally {
      setSaving(false);
    }
  }

  async function grokDraft() {
    if (!title.trim() || !description.trim()) {
      toast.error("Headline And What Happened First. Then Grok Writes The Warrant.");
      return;
    }
    setDrafting(true);
    try {
      const res = await draftWarrant({
        data: {
          title: title.trim(),
          description: description.trim(),
          impact: impact.trim(),
          category: finalCategoryPreview,
          severity: taxSeverity,
          repeatCount: nextRepeat,
          parole: paroleHits.length > 0,
        },
      });
      if (!res) return;
      setFoTitle(res.title);
      setFoBody(res.body);
      setFoDue(addCentralDays(res.dueDays));
      setFoCustomized(true);
      setIncludeFo(true);
      toast.success(res.ok ? "Warrant Drafted. Edit If You Want." : res.error);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Grok Could Not Draft This");
    } finally {
      setDrafting(false);
    }
  }

  const coolLabel = `${Math.floor(coolLeft / 60000)}:${String(Math.floor((coolLeft % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log An Offense</CardTitle>
        <CardDescription>
          Document What <strong>{otherName.split(" ")[0]}</strong> Did. Then Issue The Find Out.
          Both Of You Can Log. They Can Dispute. Times Are Central.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {truceOn ? (
            <div className="rounded-xl border border-success/40 bg-success-soft/50 px-3 py-2.5 text-sm text-fg">
              Truce Through {truceUntil}. {truceNote || "Logging Is Frozen."}
            </div>
          ) : null}
          {paroleHits.length > 0 ? (
            <div className="rounded-xl border border-warn/40 bg-warn-soft/60 px-3 py-2.5 text-sm text-fg">
              {otherName.split(" ")[0]} Is On Parole For {finalCategoryPreview} Until{" "}
              {paroleHits[0].endsOn}. This FA Auto-Escalates.
            </div>
          ) : null}
          {bondHits.length > 0 ? (
            <div className="rounded-xl border border-danger/30 bg-danger-soft/50 px-3 py-2.5 text-sm text-fg">
              Bond On Ice: {bondHits[0].title}. Logging This Burns It.
            </div>
          ) : null}
          {cooling ? (
            <div className="rounded-xl border border-warn/40 bg-warn-soft/60 px-3 py-2.5 text-sm text-fg">
              Cooling Off — {coolLabel} Remaining. Severity 4–5 Waits So You Don't Nuclear-Log At 11pm.
            </div>
          ) : null}
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

          {willTax ? (
            <div className="rounded-xl border border-danger/40 bg-danger-soft/60 p-3 sm:p-4">
              <p className="text-sm font-semibold text-danger">
                {mustFo ? `Repeat #${nextRepeat} In ${finalCategoryPreview}.` : "They Still Have Open FO."}{" "}
                This Path Burns Perks.
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {mustFo
                  ? "FO Is Mandatory. Sentence Upgrades. Outstanding FO Gets Pulled In."
                  : "New FA While FO Is Open Escalates The Docket."}{" "}
                {perkAtRisk
                  ? `On The Chopping Block: ${perkAtRisk.title}.`
                  : "No Perk In Their Bank To Burn — FO Still Gets Worse."}
              </p>
            </div>
          ) : null}

          <div className="rounded-xl border border-primary/25 bg-primary-soft/40 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label className="mb-0">The Find Out</Label>
                <p className="mt-1 text-sm text-fg-muted">
                  {mustFo
                    ? "Repeats Don't Get A Diary Entry. They Get A Bill."
                    : `FA Without FO Is Just a Diary. Sentence ${otherName.split(" ")[0]}.`}
                </p>
              </div>
              <label className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={includeFo || mustFo}
                  disabled={mustFo}
                  onChange={(e) => setIncludeFo(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                {mustFo ? "Required" : "Issue It"}
              </label>
            </div>
            {includeFo || mustFo ? (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => void grokDraft()}
                    disabled={drafting}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-primary/40 bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary hover:border-primary"
                  >
                    <Sparkles className="size-3" />
                    {drafting ? "Drafting…" : "Grok Writes The Warrant"}
                  </button>
                  {FIND_OUT_SUGGESTIONS[taxSeverity].map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => {
                        setFoCustomized(true);
                        setFoTitle(s.title);
                        setFoBody(s.body);
                        setFoDue(addCentralDays(s.dueDays));
                      }}
                      className="inline-flex min-h-9 items-center rounded-full border border-border bg-bg-elevated px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:border-primary hover:text-primary"
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
                <div>
                  <Label htmlFor="fo-title">Sentence</Label>
                  <Input
                    id="fo-title"
                    value={foTitle}
                    onChange={(e) => {
                      setFoCustomized(true);
                      setFoTitle(e.target.value);
                    }}
                    placeholder="What They Have To Do"
                  />
                </div>
                <div>
                  <Label htmlFor="fo-body">Details</Label>
                  <Textarea
                    id="fo-body"
                    value={foBody}
                    onChange={(e) => {
                      setFoCustomized(true);
                      setFoBody(e.target.value);
                    }}
                    placeholder="Spell Out The Find Out."
                    className="min-h-16"
                  />
                </div>
                <div>
                  <Label htmlFor="fo-due">Due (Central)</Label>
                  <Input
                    id="fo-due"
                    type="date"
                    value={foDue}
                    onChange={(e) => setFoDue(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={saving || truceOn || cooling}>
            <Plus className="size-4" />
            {saving
              ? "Saving…"
              : truceOn
                ? "Truce — Logging Frozen"
                : cooling
                  ? `Cooling Off — ${coolLabel}`
                  : mustFo
                ? `Log Repeat Tax + Serve FO (${otherName.split(" ")[0]})`
                : includeFo && foTitle.trim()
                ? `Log FA + Serve FO (${otherName.split(" ")[0]})`
                : `Add To Ledger (Against ${otherName.split(" ")[0]})`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
