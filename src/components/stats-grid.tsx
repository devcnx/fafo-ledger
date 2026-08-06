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
    { label: "Total offenses", value: String(s.total) },
    { label: "Open cases", value: String(s.open) },
    { label: "This month", value: String(s.thisMonth) },
    { label: "This week", value: String(s.thisWeek) },
    { label: "Avg severity", value: s.total ? s.avg.toFixed(1) : "—" },
    {
      label: "Days of peace",
      value: s.daysSinceLast === null ? "∞" : String(s.daysSinceLast),
    },
    { label: "Slap+ level", value: String(s.slap) },
    { label: "Nuclear", value: String(s.nuclear) },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {items.map((item) => (
        <Card key={item.label} className="px-3 py-3 sm:px-4 sm:py-4">
          <div className="font-display text-2xl font-semibold tabular-nums tracking-tight text-primary sm:text-3xl">
            {item.value}
          </div>
          <div className="mt-0.5 text-[11px] font-medium tracking-wide text-fg-muted uppercase">
            {item.label}
          </div>
        </Card>
      ))}
    </div>
  );
}
