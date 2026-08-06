import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  FileWarning,
  Gavel,
  Heart,
  LayoutDashboard,
  Quote,
  Scale,
  ScrollText,
  Settings,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Toaster } from "sonner";
import {
  ApologiesPanel,
  CaseFilePanel,
  ConsequencesPanel,
  CreditsPanel,
  QuotesPanel,
} from "@/components/household-hub";
import { FafoReport } from "@/components/fafo-report";
import { Insights } from "@/components/insights";
import { LogForm } from "@/components/log-form";
import { NotificationsBell } from "@/components/notifications-bell";
import { OffenseList } from "@/components/offense-list";
import { ScoreboardPanel } from "@/components/scoreboard";
import { SettingsPanel } from "@/components/settings-panel";
import { StatsGrid } from "@/components/stats-grid";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserButton } from "@/lib/auth/gates";
import { APP_NAME, APP_TAGLINE, THEME_STORAGE_KEY } from "@/lib/constants";
import { useLedger } from "@/lib/ledger-context";
import { daysBetween, formatDate } from "@/lib/utils";

export function AppShell() {
  const { profile, offenses, disputes, role, displayName, loading, error, refresh } = useLedger();
  const [tab, setTab] = useState("log");

  useEffect(() => {
    const t = (localStorage.getItem(THEME_STORAGE_KEY) as "light" | "dark" | "system") || "system";
    const dark =
      t === "dark" ||
      (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, []);

  const together = daysBetween(profile.anniversary);
  const pendingDisputes = disputes.filter((d) => d.status === "pending").length;

  if (loading) {
    return (
      <main className="grid min-h-[calc(100dvh-var(--grok-banner-h,0px))] place-items-center bg-bg">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-56 animate-pulse rounded-xl bg-bg-subtle" />
          <p className="text-sm text-fg-muted">Loading ledger…</p>
        </div>
      </main>
    );
  }

  if (error && !role) {
    return (
      <main className="grid min-h-[calc(100dvh-var(--grok-banner-h,0px))] place-items-center bg-bg px-4">
        <div className="max-w-md space-y-3 text-center">
          <p className="font-display text-xl font-semibold text-fg">Access denied</p>
          <p className="text-sm text-fg-muted">{error}</p>
          <button
            type="button"
            className="text-sm font-medium text-primary underline"
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const isTracker = role === "tracker";

  return (
    <div className="min-h-[calc(100dvh-var(--grok-banner-h,0px))] bg-bg">
      <header className="border-b border-border bg-bg-elevated">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-fg shadow-sm">
                  <ShieldAlert className="size-5" strokeWidth={2} />
                </span>
                <div>
                  <h1 className="font-display text-xl font-semibold tracking-tight text-fg sm:text-2xl">
                    {APP_NAME}
                  </h1>
                  <p className="text-xs text-fg-muted sm:text-sm">{APP_TAGLINE}</p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationsBell onNavigate={setTab} />
              <UserButton />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{displayName ?? "Signed in"}</Badge>
            <Badge variant={isTracker ? "danger" : "warn"}>
              {isTracker ? "Brittaney · full access" : "Michael · log + dispute"}
            </Badge>
            <Badge variant="muted">
              {profile.trackerName.split(" ")[0]} ⇄ {profile.subjectName.split(" ")[0]}
            </Badge>
            <Badge variant="outline">Anniv {formatDate(profile.anniversary)}</Badge>
            <Badge variant="outline">{together} days together</Badge>
            {pendingDisputes > 0 ? (
              <Badge variant="warn">
                <Gavel className="mr-1 size-3" />
                {pendingDisputes} pending dispute{pendingDisputes === 1 ? "" : "s"}
              </Badge>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <StatsGrid offenses={offenses} role={role} />

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto min-w-full flex-wrap justify-start gap-1 sm:flex-nowrap">
              <TabsTrigger value="log" className="gap-1 px-2 text-xs sm:text-sm">
                <BookOpen className="size-3.5" />
                Log
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1 px-2 text-xs sm:text-sm">
                <ScrollText className="size-3.5" />
                History
              </TabsTrigger>
              <TabsTrigger value="board" className="gap-1 px-2 text-xs sm:text-sm">
                <LayoutDashboard className="size-3.5" />
                Board
              </TabsTrigger>
              <TabsTrigger value="case" className="gap-1 px-2 text-xs sm:text-sm">
                <Briefcase className="size-3.5" />
                Case
              </TabsTrigger>
              <TabsTrigger value="sorry" className="gap-1 px-2 text-xs sm:text-sm">
                <Sparkles className="size-3.5" />
                Sorry
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-1 px-2 text-xs sm:text-sm">
                <Scale className="size-3.5" />
                Rules
              </TabsTrigger>
              <TabsTrigger value="love" className="gap-1 px-2 text-xs sm:text-sm">
                <Heart className="size-3.5" />
                Love
              </TabsTrigger>
              <TabsTrigger value="quotes" className="gap-1 px-2 text-xs sm:text-sm">
                <Quote className="size-3.5" />
                Quotes
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1 px-2 text-xs sm:text-sm">
                <BarChart3 className="size-3.5" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="fafo" className="gap-1 px-2 text-xs sm:text-sm">
                <FileWarning className="size-3.5" />
                FAFO
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1 px-2 text-xs sm:text-sm">
                <Settings className="size-3.5" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="log">
            <LogForm onLogged={() => setTab("history")} />
          </TabsContent>
          <TabsContent value="history">
            <OffenseList />
          </TabsContent>
          <TabsContent value="board">
            <ScoreboardPanel />
          </TabsContent>
          <TabsContent value="case">
            <CaseFilePanel />
          </TabsContent>
          <TabsContent value="sorry">
            <ApologiesPanel />
          </TabsContent>
          <TabsContent value="rules">
            <ConsequencesPanel />
          </TabsContent>
          <TabsContent value="love">
            <CreditsPanel />
          </TabsContent>
          <TabsContent value="quotes">
            <QuotesPanel />
          </TabsContent>
          <TabsContent value="insights">
            <Insights />
          </TabsContent>
          <TabsContent value="fafo">
            <FafoReport />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsPanel />
          </TabsContent>
        </Tabs>

        <footer className="mt-10 pb-8 text-center text-xs text-fg-subtle">
          Signed-in only · Shared household ledger · Both partners log & dispute · Central time
        </footer>
      </main>

      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "border border-border bg-bg-elevated text-fg shadow-md",
        }}
      />

      <style>{`
        @media print {
          header a, .print\\:hidden, [data-created-with-grok-banner],
          [role="tablist"] { display: none !important; }
          body { background: white; }
          main { max-width: 100%; padding: 0; }
        }
      `}</style>
    </div>
  );
}
