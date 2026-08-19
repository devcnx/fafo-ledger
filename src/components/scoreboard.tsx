import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLedger } from "@/lib/ledger-context";
import { buildHeatmap, buildScoreboard, buildWarnings, daysUntilNext } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export function ScoreboardPanel() {
  const { offenses, disputes, credits, role, profile, peaceStreaks, perks } = useLedger();
  if (!role) return null;
  const board = buildScoreboard(offenses, disputes, credits, role);
  const heat = buildHeatmap(offenses, 84);
  const warnings = buildWarnings(offenses);
  const maxHeat = Math.max(1, ...heat.map((h) => h.count));
  const mineStreak = peaceStreaks.find((s) => s.role === role);
  const peacePerks = perks.filter((p) => p.source === "peace_streak" && p.assignedToRole === role).length;

  const countdowns = [
    { label: "Anniversary", days: daysUntilNext(profile.anniversary), date: profile.anniversary },
    {
      label: `${profile.trackerName.split(" ")[0]}'s Birthday`,
      days: daysUntilNext(profile.trackerBirthday),
      date: profile.trackerBirthday,
    },
    {
      label: `${profile.subjectName.split(" ")[0]}'s Birthday`,
      days: daysUntilNext(profile.subjectBirthday),
      date: profile.subjectBirthday,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Open vs You" value={String(board.openAgainst)} />
        <Stat label="Peace Streak" value={board.peaceStreak === null ? "∞" : String(board.peaceStreak)} />
        <Stat
          label="Next Perk"
          value={
            mineStreak?.nextMilestone
              ? `${mineStreak.daysUntilNext}d → ${mineStreak.nextMilestone}`
              : "Maxed"
          }
        />
        <Stat label="Peace Perks" value={String(peacePerks)} />
        <Stat
          label="Dispute Win %"
          value={board.disputeWinRate === null ? "—" : `${board.disputeWinRate}%`}
        />
        <Stat label="Credits Earned" value={String(board.creditsAccepted)} />
        <Stat label="You Logged" value={String(board.loggedByMe)} />
        <Stat label="Forgiven vs You" value={String(board.forgivenAgainst)} />
        <Stat label="Disputes Pending" value={String(board.disputePending)} />
        <Stat label="Nuclear vs You" value={String(board.nuclear)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{"Don't Mess This Up"}</CardTitle>
          <CardDescription>Countdowns (Central Calendar).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          {countdowns.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-bg p-3">
              <p className="text-xs font-medium text-fg-muted uppercase">{c.label}</p>
              <p className="font-display text-2xl font-semibold text-primary tabular-nums">
                {c.days === 0 ? "Today" : `${c.days}d`}
              </p>
              <p className="text-xs text-fg-subtle">{formatDate(c.date)}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peace Heat Map</CardTitle>
          <CardDescription>Last 12 Weeks · Darker = More Offenses That Day.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {heat.map((d) => {
              const intensity = d.count === 0 ? 0 : 0.2 + (d.count / maxHeat) * 0.8;
              return (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.count}`}
                  className="size-3 rounded-sm border border-border sm:size-3.5"
                  style={{
                    background:
                      d.count === 0
                        ? "var(--color-bg-subtle)"
                        : `color-mix(in srgb, var(--color-primary) ${Math.round(intensity * 100)}%, var(--color-bg-subtle))`,
                  }}
                />
              );
            })}
          </div>
          <p className="mt-3 text-sm text-fg-muted">
            Peace streak:{" "}
            <strong className="text-fg">
              {board.peaceStreak === null ? "infinite (no logs yet)" : `${board.peaceStreak} day(s)`}
            </strong>
          </p>
        </CardContent>
      </Card>

      {warnings.length > 0 ? (
        <Card className="border-warn/30">
          <CardHeader>
            <CardTitle className="text-warn">Pattern Warnings</CardTitle>
            <CardDescription>Auto Flags from Recent Activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {warnings.map((w) => (
                <li
                  key={w}
                  className="rounded-lg border border-warn/20 bg-warn-soft px-3 py-2 text-sm text-fg"
                >
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-fg-muted">
            No pattern warnings right now. Stay boring.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-3 py-3">
      <div className="font-display text-2xl font-semibold tabular-nums text-primary">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium tracking-wide text-fg-muted uppercase">
        {label}
      </div>
    </Card>
  );
}
