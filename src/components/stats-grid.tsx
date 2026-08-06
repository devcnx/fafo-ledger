import { selectStats } from "@/lib/store";
import type { AppRole } from "@/lib/roles";
import type { Offense } from "@/lib/types";
import { Card } from "@/components/ui/card";

export function StatsGrid({
  offenses,
  role,
}: {
  offenses: Offense[];
  role?: AppRole | null;
}) {
  const s = selectStats(offenses, role);

  const items = [
    { label: "Total", full: "Total Offenses", value: String(s.total) },
    { label: "Open", full: "Open Cases", value: String(s.open) },
    { label: "Month", full: "This Month", value: String(s.thisMonth) },
    { label: "Week", full: "This Week", value: String(s.thisWeek) },
    { label: "Avg Sev", full: "Avg Severity", value: s.total ? s.avg.toFixed(1) : "—" },
    {
      label: "Peace",
      full: "Days of Peace",
      value: s.daysSinceLast === null ? "∞" : String(s.daysSinceLast),
    },
    { label: "Slap+", full: "Slap+ Level", value: String(s.slap) },
    { label: "Nuke", full: "Nuclear", value: String(s.nuclear) },
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-4 sm:gap-3">
      {items.map((item) => (
        <Card key={item.full} className="px-2 py-2.5 sm:px-4 sm:py-4">
          <div className="font-display text-xl font-semibold tabular-nums tracking-tight text-primary sm:text-3xl">
            {item.value}
          </div>
          <div
            className="mt-0.5 truncate text-[10px] font-medium tracking-wide text-fg-muted uppercase sm:text-[11px]"
            title={item.full}
          >
            <span className="sm:hidden">{item.label}</span>
            <span className="hidden sm:inline">{item.full}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
