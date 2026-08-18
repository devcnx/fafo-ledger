import { selectStats } from "@/lib/store";
import type { AppRole } from "@/lib/roles";
import type { FindOut, Offense } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { isFindOutOpen, isFindOutOverdue } from "@/lib/find-out";
import { cn } from "@/lib/utils";

export function StatsGrid({
  offenses,
  findOuts = [],
  role,
}: {
  offenses: Offense[];
  findOuts?: FindOut[];
  role?: AppRole | null;
}) {
  const s = selectStats(offenses, role);
  const foOpen = findOuts.filter(isFindOutOpen).length;
  const foLate = findOuts.filter(isFindOutOverdue).length;
  const foServed = findOuts.filter((f) => f.status === "served").length;
  const faWithoutFo = offenses.filter(
    (o) => !o.archived && o.status === "open" && !findOuts.some((f) => f.offenseId === o.id),
  ).length;

  const items = [
    { label: "FA", full: "Fuck Arounds Logged", value: String(s.total), tone: "default" as const },
    { label: "FO Due", full: "Find Outs Open", value: String(foOpen), tone: foOpen ? ("primary" as const) : ("default" as const) },
    { label: "FO Late", full: "Find Outs Overdue", value: String(foLate), tone: foLate ? ("danger" as const) : ("default" as const) },
    { label: "Served", full: "Find Outs Served", value: String(foServed), tone: foServed ? ("success" as const) : ("default" as const) },
    { label: "No FO", full: "Open FA Without FO", value: String(faWithoutFo), tone: faWithoutFo ? ("warn" as const) : ("default" as const) },
    { label: "Avg Sev", full: "Avg Severity", value: s.total ? s.avg.toFixed(1) : "—", tone: "default" as const },
    {
      label: "Peace",
      full: "Days of Peace",
      value: s.daysSinceLast === null ? "∞" : String(s.daysSinceLast),
      tone: "default" as const,
    },
    { label: "Nuke", full: "Nuclear", value: String(s.nuclear), tone: s.nuclear ? ("danger" as const) : ("default" as const) },
  ];

  return (
    <div className="mb-4 grid grid-cols-4 gap-1.5 sm:gap-3">
      {items.map((item) => (
        <Card
          key={item.full}
          className={cn(
            "px-2 py-2.5 sm:px-4 sm:py-4",
            item.tone === "danger" && "border-danger/40",
            item.tone === "primary" && "border-primary/40",
            item.tone === "warn" && "border-warn/40",
          )}
        >
          <div
            className={cn(
              "font-display text-xl font-semibold tabular-nums tracking-tight sm:text-3xl",
              item.tone === "danger" ? "text-danger" : item.tone === "success" ? "text-success" : "text-primary",
            )}
          >
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
