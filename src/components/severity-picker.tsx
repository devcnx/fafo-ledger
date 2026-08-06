import type { Severity, SeverityLabels } from "@/lib/types";
import { SEVERITY_META, severityLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LEVELS: Severity[] = [1, 2, 3, 4, 5];

export function SeverityPicker({
  value,
  onChange,
  labels,
}: {
  value: Severity;
  onChange: (v: Severity) => void;
  labels?: SeverityLabels;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2" role="radiogroup" aria-label="Severity">
      {LEVELS.map((level) => {
        const meta = SEVERITY_META[level];
        const active = value === level;
        const short =
          labels?.[level]?.split(" ").slice(0, 2).join(" ") || meta.short;
        return (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={active}
            title={severityLabel(level, labels)}
            onClick={() => onChange(level)}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center transition-all",
              active
                ? "border-primary bg-primary-soft shadow-sm ring-2 ring-primary/20"
                : "border-border bg-bg-elevated hover:border-border-strong hover:bg-bg-subtle",
            )}
          >
            <span
              className="text-base font-semibold tabular-nums"
              style={{ color: meta.color }}
            >
              {level}
            </span>
            <span
              className={cn(
                "line-clamp-2 text-[10px] font-medium leading-tight sm:text-xs",
                active ? "text-primary" : "text-fg-muted",
              )}
            >
              {short}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SeverityBadge({
  severity,
  labels,
}: {
  severity: Severity;
  labels?: SeverityLabels;
}) {
  const meta = SEVERITY_META[severity];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: meta.soft, color: meta.color }}
    >
      <span className="tabular-nums">{severity}</span>
      <span>{labels?.[severity] ? labels[severity]!.slice(0, 18) : meta.short}</span>
    </span>
  );
}
