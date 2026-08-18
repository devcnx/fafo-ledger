import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Lock, Moon, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DEFAULT_SEVERITY_LABELS, THEME_STORAGE_KEY } from "@/lib/constants";
import { hashPin } from "@/lib/evidence";
import { regenerateInviteCode } from "@/lib/ledger";
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
    findOuts,
    perks,
    role,
    settings,
    updateSettings,
    purgeForgiven,
    templates,
    saveTemplate,
    deleteTemplate,
    categories,
    inviteCode,
    isOwner,
    householdMode,
    refresh,
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

  if (role !== "tracker" && !isOwner) {
    return (
      <div className="space-y-4">
        <ThemeCard theme={theme} applyTheme={applyTheme} />
        <PinCard pinA={pinA} pinB={pinB} setPinA={setPinA} setPinB={setPinB} />
        <InviteCard inviteCode={inviteCode} canManage={false} onRefresh={refresh} />
        <Card>
          <CardContent className="py-10 text-center text-sm text-fg-muted">
            Household Profile, Severity Labels, and Purge Tools Are Owner-Only. You Can Still Use
            Theme + PIN on This Device.
          </CardContent>
        </Card>
      </div>
    );
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await updateProfile(draft);
      toast.success("Profile Saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save Failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    try {
      await updateSettings({ severityLabels: labels, purgeForgivenDays: purgeDays });
      toast.success("Settings Saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save Failed");
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
      findOuts,
      credits,
      quotes,
      perks,
    };
    downloadText(
      `fafo-ledger-${centralTodayYmd()}.json`,
      JSON.stringify(data, null, 2),
      "application/json",
    );
    toast.success("Backup Downloaded.");
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
    toast.success("CSV Downloaded.");
  }

  async function handleClear() {
    if (offenses.length === 0) {
      toast.message("Nothing to Clear.");
      return;
    }
    if (!confirm(`Delete All ${offenses.length} Offenses and Disputes? This Cannot Be Undone.`))
      return;
    try {
      await clearOffenses();
      toast.success("Ledger Wiped.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear Failed");
    }
  }

  return (
    <div className="space-y-4">
      <ThemeCard theme={theme} applyTheme={applyTheme} />
      <PinCard pinA={pinA} pinB={pinB} setPinA={setPinA} setPinB={setPinB} />

      <InviteCard inviteCode={inviteCode} canManage mode={householdMode} onRefresh={refresh} />
      <Card>
        <CardHeader>
          <CardTitle>Relationship Profile</CardTitle>
          <CardDescription>
            Names and Calendar Dates (Central). No Timezone Shift on Anniversaries/Birthdays.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="tracker">Your Name</Label>
              <Input
                id="tracker"
                value={draft.trackerName}
                onChange={(e) => setDraft({ ...draft, trackerName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="subject">Partner Name</Label>
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
                Displays As {formatDate(draft.anniversary || "2025-06-16")}
              </p>
            </div>
            <div>
              <Label htmlFor="tbday">Your Birthday</Label>
              <Input
                id="tbday"
                type="date"
                value={draft.trackerBirthday}
                onChange={(e) => setDraft({ ...draft, trackerBirthday: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sbday">Partner Birthday</Label>
              <Input
                id="sbday"
                type="date"
                value={draft.subjectBirthday}
                onChange={(e) => setDraft({ ...draft, subjectBirthday: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Private Notes</Label>
            <Textarea
              id="notes"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
          <Button type="button" onClick={() => void saveProfile()} disabled={saving}>
            {saving ? "Saving…" : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Severity Labels</CardTitle>
          <CardDescription>Rename the Scale in Your Voice.</CardDescription>
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
            <Label>Auto-Purge Forgiven After (Days, 0 = Off)</Label>
            <Input
              type="number"
              min={0}
              value={purgeDays}
              onChange={(e) => setPurgeDays(Number(e.target.value) || 0)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveSettings()}>
              Save Labels & Purge Rule
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void purgeForgiven()
                  .then(() => toast.success("Purged Old Forgiven Entries."))
                  .catch((e) => toast.error(e instanceof Error ? e.message : "Purge Failed"))
              }
            >
              Run Purge Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log Templates</CardTitle>
          <CardDescription>One-Tap Offense Starters for Both of You.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              placeholder="Template Title"
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
              if (!tplTitle.trim()) return toast.error("Title Required");
              void saveTemplate({
                title: tplTitle.trim(),
                category: tplCat,
                severity: tplSev,
              }).then(() => {
                setTplTitle("");
                toast.success("Template Saved.");
              });
            }}
          >
            Add Template
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
          <CardTitle>Backup & Export</CardTitle>
          <CardDescription>Export Anytime Before Purging.</CardDescription>
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
          <CardTitle className="text-danger">Danger Zone</CardTitle>
          <CardDescription>Wipe All Offenses and Disputes. Profile Stays.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="danger" onClick={() => void handleClear()}>
            <Trash2 className="size-4" />
            Clear All Offenses
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
        <CardDescription>Light / Dark on This Device.</CardDescription>
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
          PIN Lock
        </CardTitle>
        <CardDescription>
          Optional Second Lock After Login — Only on This Browser.
          {hasPin ? " A PIN Is Currently Set." : ""}
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
              if (pinA.length < 4) return toast.error("At Least 4 Characters.");
              if (pinA !== pinB) return toast.error("PINs Don’t Match.");
              localStorage.setItem(PIN_STORAGE_KEY, await hashPin(pinA));
              sessionStorage.setItem("fafo-pin-ok", "1");
              setPinA("");
              setPinB("");
              toast.success("PIN Set.");
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
                toast.message("PIN Cleared.");
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


function InviteCard({
  inviteCode,
  canManage,
  mode,
  onRefresh,
}: {
  inviteCode: string | null;
  canManage: boolean;
  mode?: "solo" | "couple" | null;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  async function refreshCode() {
    setBusy(true);
    try {
      const res = await regenerateInviteCode();
      toast.success(`New code: ${res.inviteCode}`);
      await onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Refresh Code");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Household Invite</CardTitle>
        <CardDescription>
          Share This Code So Your Partner Can Sign Up and Join This Ledger
          {mode === "solo" ? " (Turns Solo into a Shared Household)" : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <code className="rounded-xl border border-border bg-bg px-4 py-2 font-mono text-lg tracking-[0.2em] text-primary">
          {inviteCode ?? "—"}
        </code>
        {inviteCode ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void navigator.clipboard.writeText(inviteCode);
              toast.success("Invite Code Copied.");
            }}
          >
            Copy Code
          </Button>
        ) : null}
        {canManage ? (
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void refreshCode()}>
            {busy ? "…" : "New Code"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
