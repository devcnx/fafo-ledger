import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  FileWarning,
  Gavel,
  Gift,
  Heart,
  LayoutDashboard,
  Quote,
  Scale,
  ScrollText,
  Settings,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Toaster } from "sonner";
import {
  ApologiesPanel,
  CaseFilePanel,
  ConsequencesPanel,
  CreditsPanel,
  QuotesPanel,
} from "@/components/household-hub";
import { FindOutPanel } from "@/components/find-out-panel";
import { FafoReport } from "@/components/fafo-report";
import { FoWarrant } from "@/components/fo-warrant";
import { PerkBank } from "@/components/perk-bank";
import { PerksPanel } from "@/components/perks-panel";
import { Insights } from "@/components/insights";
import { LogForm } from "@/components/log-form";
import { NotificationsBell } from "@/components/notifications-bell";
import { OffenseList } from "@/components/offense-list";
import { Onboarding } from "@/components/onboarding";
import { ScoreboardPanel } from "@/components/scoreboard";
import { SettingsPanel } from "@/components/settings-panel";
import { StatsGrid } from "@/components/stats-grid";
import { TabRail } from "@/components/tab-rail";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { UserButton } from "@/lib/auth/gates";
import { APP_NAME, APP_TAGLINE, THEME_STORAGE_KEY } from "@/lib/constants";
import { isFindOutOpen } from "@/lib/find-out";
import { isPerkSpendable } from "@/lib/perks";
import { useLedger } from "@/lib/ledger-context";
import { daysBetween, formatDate } from "@/lib/utils";

type TabId =
  | "log"
  | "history"
  | "board"
  | "case"
  | "sorry"
  | "rules"
  | "love"
  | "perks"
  | "quotes"
  | "insights"
  | "findout"
  | "fafo"
  | "settings";

const ALL_TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "log", label: "Log", icon: BookOpen },
  { id: "history", label: "History", icon: ScrollText },
  { id: "findout", label: "Find Out", icon: Gavel },
  { id: "fafo", label: "FAFO", icon: FileWarning },
  { id: "perks", label: "Perks", icon: Gift },
  { id: "board", label: "Board", icon: LayoutDashboard },
  { id: "case", label: "Case", icon: Briefcase },
  { id: "sorry", label: "Sorry", icon: Sparkles },
  { id: "rules", label: "Rules", icon: Scale },
  { id: "love", label: "Love", icon: Heart },
  { id: "quotes", label: "Quotes", icon: Quote },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const {
    profile,
    offenses,
    disputes,
    findOuts,
    perks,
    role,
    displayName,
    email,
    loading,
    error,
    refresh,
    needsOnboarding,
    isOwner,
    inviteCode,
    householdMode,
  } = useLedger();
  const [tab, setTab] = useState<string>("log");
  const [autoRouted, setAutoRouted] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem(THEME_STORAGE_KEY) as "light" | "dark" | "system") || "system";
    const dark =
      t === "dark" ||
      (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, []);

  const myOpenFindOuts = findOuts.filter((f) => f.assignedToRole === role && isFindOutOpen(f));
  const myPerks = perks.filter((p) => p.assignedToRole === role && isPerkSpendable(p));
  const pendingPerkHonor = perks.filter((p) => p.grantedByRole === role && p.status === "pending");
  const perkBadgeCount = myPerks.length + pendingPerkHonor.length;

  useEffect(() => {
    if (loading || autoRouted || !role) return;
    if (myOpenFindOuts.length > 0) setTab("findout");
    setAutoRouted(true);
  }, [loading, role, autoRouted, myOpenFindOuts.length]);

  const together = daysBetween(profile.anniversary);
  const pendingDisputes = disputes.filter((d) => d.status === "pending").length;

  if (loading) {
    return (
      <main className="grid min-h-[calc(100dvh-var(--grok-banner-h,0px))] place-items-center bg-bg px-4">
        <div className="w-full max-w-sm space-y-3 text-center">
          <div className="mx-auto h-10 w-48 max-w-full animate-pulse rounded-xl bg-bg-subtle" />
          <p className="text-sm text-fg-muted">Loading Ledger…</p>
        </div>
      </main>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="min-h-[calc(100dvh-var(--grok-banner-h,0px))] bg-bg">
        <Onboarding
          displayName={displayName ?? ""}
          email={email ?? ""}
          onDone={async () => {
            await refresh();
          }}
        />
        <Toaster position="bottom-center" />
      </div>
    );
  }

  if (error && !role) {
    return (
      <main className="grid min-h-[calc(100dvh-var(--grok-banner-h,0px))] place-items-center bg-bg px-4">
        <div className="w-full max-w-md space-y-3 text-center">
          <p className="font-display text-xl font-semibold text-fg">Access Denied</p>
          <p className="text-sm text-fg-muted">{error}</p>
          <button
            type="button"
            className="min-h-11 text-sm font-medium text-primary underline"
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const isTracker = role === "tracker";
  const roleBadge = isOwner
    ? `${displayName?.split(" ")[0] ?? "You"} · Owner`
    : isTracker
      ? `${profile.trackerName.split(" ")[0]} · Tracker`
      : `${profile.subjectName.split(" ")[0]} · Partner`;

  function selectTab(id: string) {
    setTab(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="relative min-h-[calc(100dvh-var(--grok-banner-h,0px))] w-full overflow-x-clip bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg-elevated/95 backdrop-blur-md supports-[backdrop-filter]:bg-bg-elevated/90">
        <div className="mx-auto w-full max-w-4xl px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg shadow-sm sm:size-10">
                <ShieldAlert className="size-4 sm:size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-lg font-semibold tracking-tight text-fg sm:text-xl md:text-2xl">
                  {APP_NAME}
                </h1>
                <p className="truncate text-[11px] leading-snug text-fg-muted sm:text-sm">
                  {APP_TAGLINE}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <NotificationsBell onNavigate={selectTab} />
              <UserButton />
            </div>
          </div>

          <div className="scroll-x mt-3 flex gap-1.5 pb-0.5">
            <Badge variant="default" className="shrink-0">
              {displayName?.split(" ")[0] ?? "Signed In"}
            </Badge>
            <Badge variant={isTracker ? "danger" : "warn"} className="shrink-0">
              {roleBadge}
            </Badge>
            <Badge variant="muted" className="shrink-0">
              {profile.trackerName.split(" ")[0]} ⇄ {profile.subjectName.split(" ")[0]}
            </Badge>
            {householdMode ? (
              <Badge variant="outline" className="shrink-0">
                {householdMode === "solo" ? "Solo" : "Couple"}
              </Badge>
            ) : null}
            <Badge variant="outline" className="shrink-0">
              {formatDate(profile.anniversary)}
            </Badge>
            <Badge variant="outline" className="shrink-0">
              {together}d
            </Badge>
            {pendingDisputes > 0 ? (
              <Badge variant="warn" className="shrink-0">
                <Gavel className="mr-1 size-3" />
                {pendingDisputes}
              </Badge>
            ) : null}
            {isOwner && inviteCode ? (
              <Badge variant="outline" className="shrink-0 font-mono tracking-wide">
                {inviteCode}
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl px-3 pb-2.5 sm:px-6">
          <TabRail
            tabs={ALL_TABS}
            value={tab}
            onChange={selectTab}
            badges={{
              findout: myOpenFindOuts.length,
              perks: perkBadgeCount,
            }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-3 py-4 pb-8 sm:px-6 sm:py-6 sm:pb-10">
        <StatsGrid offenses={offenses} findOuts={findOuts} perks={perks} role={role} />

        <FoWarrant onOpen={() => selectTab("findout")} />

        <PerkBank onOpen={() => selectTab("perks")} />

        <Tabs value={tab} onValueChange={selectTab} className="mt-4 sm:mt-6">
          <TabsContent value="log" className="mt-0">
            <LogForm onLogged={(r) => selectTab(r.findOut ? "findout" : "history")} />
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            <OffenseList />
          </TabsContent>
          <TabsContent value="findout" className="mt-0">
            <FindOutPanel />
          </TabsContent>
          <TabsContent value="board" className="mt-0">
            <ScoreboardPanel />
          </TabsContent>
          <TabsContent value="case" className="mt-0">
            <CaseFilePanel />
          </TabsContent>
          <TabsContent value="sorry" className="mt-0">
            <ApologiesPanel />
          </TabsContent>
          <TabsContent value="rules" className="mt-0">
            <ConsequencesPanel />
          </TabsContent>
          <TabsContent value="love" className="mt-0">
            <CreditsPanel />
          </TabsContent>
          <TabsContent value="perks" className="mt-0">
            <PerksPanel />
          </TabsContent>
          <TabsContent value="quotes" className="mt-0">
            <QuotesPanel />
          </TabsContent>
          <TabsContent value="insights" className="mt-0">
            <Insights />
          </TabsContent>
          <TabsContent value="fafo" className="mt-0">
            <FafoReport />
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            <SettingsPanel />
          </TabsContent>
        </Tabs>

        <footer className="mt-10 hidden text-center text-xs text-fg-subtle sm:block">
          Private Household Ledgers · Invite Your Partner · Central Time
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
          header, nav, [data-created-with-grok-banner] { display: none !important; }
          body { background: white; }
          main { max-width: 100%; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
