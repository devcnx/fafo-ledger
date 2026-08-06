import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Lock, Moon, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DEFAULT_SEVERITY_LABELS, THEME_STORAGE_KEY } from "@/lib/constants";
import { hashPin } from "@/lib/evidence";
import { useLedger } from "@/lib/ledger-context";
import type { Severity, SeverityLabels } from "@/lib/types";
import { centralTodayYmd, downloadText, formatDate } from "@/lib/utils";
import { PIN_STORAGE_KEY } from "@/lib/constants";

export function SettingsPanel() {
  const {
    profile,
    updateProfile,
    clearOffenses,
    offenses,
    disputes,
    apologies,
    consequences,
    credits,
    quotes,
    role,
    settings,
    updateSettings,
    purgeForgiven,
    templates,
    saveTemplate,
    deleteTemplate,
    categories,
  } = useLedger();
  const [draft, setDraft] = useState(profile);
  const [labels, setLabels] = useState<SeverityLabels>(settings.severityLabels);
  const [purgeDays, setPurgeDays] = useState(settings.purgeForgivenDays);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [pinA, setPinA] = useState("");
  const [pinB, setPinB] = useState("");
  const [tplTitle, setTplTitle] = useState("");
  const [tplCat, setTplCat] = useState(categories[0] ?? "Other");
  const [tplSev, setTplSev] = useState<Severity>(2);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  useEffect(() => {
    setLabels(settings.severityLabels);
    setPurgeDays(settings.purgeForgivenDays);
  }, [settings]);

  useEffect(() => {
    const t = (localStorage.getItem(THEME_STORAGE_KEY) as "light" | "dark" | "system") || "system";
    setTheme(t);
  }, []);

  function applyTheme(next: "light" | "dark" | "system") {
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    const root = document.documentElement;
    const dark =
      next === "dark" ||
      (next === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
  }

  if (role !== "tracker") {
    return (
      <div className="space-y-4">
        <ThemeCard theme={theme} applyTheme={applyTheme} />
        <PinCard pinA={pinA} pinB={pinB} setPinA={setPinA} setPinB={setPinB} />
        <Card>
          <CardContent className="py-10 text-center text-sm text-fg-muted">
            Household profile, severity labels, and purge tools are Brittaney-only. You can still
            use theme + PIN on this device.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await updateProfile(draft);
      toast.success("Profile saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    try {
      await updateSettings({ severityLabels: labels, purgeForgivenDays: purgeDays });
      toast.success("Settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  function handleExportJson() {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      timezone: "America/Chicago",
      profile,
      settings,
      offenses,
      disputes,
      apologies,
      consequences,
      credits,
      quotes,
    };
    downloadText(
      `fafo-ledger-${centralTodayYmd()}.json`,
      JSON.stringify(data, null, 2),
      "application/json",
    );
    toast.success("Backup downloaded.");
  }

  function handleExportCsv() {
    const rows = [
      [
        "id",
        "date",
        "severity",
        "category",
        "title",
        "description",
        "impact",
        "status",
        "author",
        "against",
      ],
      ...offenses.map((o) => [
        o.id,
        o.date,
        String(o.severity),
        o.category,
        o.title.replaceAll('"', '""'),
        o.description.replaceAll('"', '""'),
        o.impact.replaceAll('"', '""'),
        o.status,
        o.authorRole,
        o.againstRole,
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\n");
    downloadText(`fafo-ledger-${centralTodayYmd()}.csv`, csv, "text/csv");
    toast.success("CSV downloaded.");
  }

  async function handleClear() {
    if (offenses.length === 0) {
      toast.message("Nothing to clear.");
      return;
    }
    if (!confirm(`Delete all ${offenses.length} offenses and disputes? This cannot be undone.`))
      return;
    try {
      await clearOffenses();
      toast.success("Ledger wiped.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed");
    }
  }

  return (
    <div className="space-y-4">
      <ThemeCard theme={theme} applyTheme={applyTheme} />
      <PinCard pinA={pinA} pinB={pinB} setPinA={setPinA} setPinB={setPinB} />

      <Card>
        <CardHeader>
          <CardTitle>Relationship profile</CardTitle>
          <CardDescription>
            Names and calendar dates (Central). No timezone shift on anniversaries/birthdays.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="tracker">Your name</Label>
              <Input
                id="tracker"
                value={draft.trackerName}
                onChange={(e) => setDraft({ ...draft, trackerName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subject">His name</Label>
              <Input
                id="subject"
                value={draft.subjectName}
                onChange={(e) => setDraft({ ...draft, subjectName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="anniv">Anniversary</Label>
              <Input
                id="anniv"
                type="date"
                value={draft.anniversary}
                onChange={(e) => setDraft({ ...draft, anniversary: e.target.value })}
              />
              <p className="mt-1 text-xs text-fg-subtle">
                Displays as {formatDate(draft.anniversary || "2025-06-16")}
              </p>
            </div>
            <div>
              <Label htmlFor="tbday">Your birthday</Label>
              <Input
                id="tbday"
                type="date"
                value={draft.trackerBirthday}
                onChange={(e) => setDraft({ ...draft, trackerBirthday: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sbday">His birthday</Label>
              <Input
                id="sbday"
                type="date"
                value={draft.subjectBirthday}
                onChange={(e) => setDraft({ ...draft, subjectBirthday: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Private notes</Label>
            <Textarea
              id="notes"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
          <Button type="button" onClick={() => void saveProfile()} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Severity labels</CardTitle>
          <CardDescription>Rename the scale in your voice.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {([1, 2, 3, 4, 5] as Severity[]).map((n) => (
            <div key={n}>
              <Label>Level {n}</Label>
              <Input
                value={labels[n] ?? DEFAULT_SEVERITY_LABELS[n]}
                onChange={(e) => setLabels({ ...labels, [n]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <Label>Auto-purge forgiven after (days, 0 = off)</Label>
            <Input
              type="number"
              min={0}
              value={purgeDays}
              onChange={(e) => setPurgeDays(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveSettings()}>
              Save labels & purge rule
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void purgeForgiven()
                  .then(() => toast.success("Purged old forgiven entries."))
                  .catch((e) => toast.error(e instanceof Error ? e.message : "Purge failed"))
              }
            >
              Run purge now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log templates</CardTitle>
          <CardDescription>One-tap offense starters for both of you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              placeholder="Template title"
              value={tplTitle}
              onChange={(e) => setTplTitle(e.target.value)}
            />
            <select
              value={tplCat}
              onChange={(e) => setTplCat(e.target.value)}
              className="flex h-10 rounded-lg border border-border bg-bg-elevated px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={tplSev}
              onChange={(e) => setTplSev(Number(e.target.value) as Severity)}
              className="flex h-10 rounded-lg border border-border bg-bg-elevated px-3 text-sm"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  Sev {n}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={() => {
              if (!tplTitle.trim()) return toast.error("Title required");
              void saveTemplate({
                title: tplTitle.trim(),
                category: tplCat,
                severity: tplSev,
              }).then(() => {
                setTplTitle("");
                toast.success("Template saved.");
              });
            }}
          >
            Add template
          </Button>
          <ul className="space-y-1">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  {t.title}{" "}
                  <span className="text-fg-muted">
                    · {t.category} · sev {t.severity}
                  </span>
                </span>
                <Button size="sm" variant="ghost" onClick={() => void deleteTemplate(t.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup & export</CardTitle>
          <CardDescription>Export anytime before purging.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={handleExportJson}>
            <Download className="size-4" />
            Export JSON
          </Button>
          <Button type="button" variant="secondary" onClick={handleExportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <Card className="border-danger/20">
        <CardHeader>
          <CardTitle className="text-danger">Danger zone</CardTitle>
          <CardDescription>Wipe all offenses and disputes. Profile stays.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="danger" onClick={() => void handleClear()}>
            <Trash2 className="size-4" />
            Clear all offenses
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ThemeCard({
  theme,
  applyTheme,
}: {
  theme: "light" | "dark" | "system";
  applyTheme: (t: "light" | "dark" | "system") => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Light / dark on this device.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {(
          [
            ["light", "Light", Sun],
            ["dark", "Dark", Moon],
            ["system", "System", Sun],
          ] as const
        ).map(([v, label, Icon]) => (
          <Button
            key={v}
            type="button"
            variant={theme === v ? "default" : "secondary"}
            size="sm"
            onClick={() => applyTheme(v)}
          >
            <Icon className="size-3.5" />
            {label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function PinCard({
  pinA,
  pinB,
  setPinA,
  setPinB,
}: {
  pinA: string;
  pinB: string;
  setPinA: (v: string) => void;
  setPinB: (v: string) => void;
}) {
  const hasPin =
    typeof window !== "undefined" && Boolean(localStorage.getItem(PIN_STORAGE_KEY));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="size-4" />
          PIN lock
        </CardTitle>
        <CardDescription>
          Optional second lock after login — only on this browser.
          {hasPin ? " A PIN is currently set." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>New PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              value={pinA}
              onChange={(e) => setPinA(e.target.value)}
            />
          </div>
          <div>
            <Label>Confirm</Label>
            <Input
              type="password"
              inputMode="numeric"
              value={pinB}
              onChange={(e) => setPinB(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={async () => {
              if (pinA.length < 4) return toast.error("At least 4 characters.");
              if (pinA !== pinB) return toast.error("PINs don’t match.");
              localStorage.setItem(PIN_STORAGE_KEY, await hashPin(pinA));
              sessionStorage.setItem("fafo-pin-ok", "1");
              setPinA("");
              setPinB("");
              toast.success("PIN set.");
            }}
          >
            Save PIN
          </Button>
          {hasPin ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                localStorage.removeItem(PIN_STORAGE_KEY);
                sessionStorage.removeItem("fafo-pin-ok");
                toast.message("PIN cleared.");
              }}
            >
              Remove PIN
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
