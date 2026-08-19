import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabRailItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export function TabRail({
  tabs,
  value,
  onChange,
  badges,
  compact,
}: {
  tabs: TabRailItem[];
  value: string;
  onChange: (id: string) => void;
  badges?: Partial<Record<string, number>>;
  /** Tighter chips for a fixed mobile bar */
  compact?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [progress, setProgress] = useState({ left: 0, width: 1 });

  function measure() {
    const el = scrollerRef.current;
    if (!el) return;
    const max = Math.max(1, el.scrollWidth - el.clientWidth);
    const left = el.scrollLeft;
    setCanLeft(left > 2);
    setCanRight(left < max - 2);
    setProgress({
      left: left / max,
      width: Math.min(1, el.clientWidth / Math.max(el.scrollWidth, 1)),
    });
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [tabs.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLElement>(`[data-tab-id="${value}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [value]);

  function nudge(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.6), behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-bg-subtle",
          compact && "rounded-none border-x-0 border-b-0",
        )}
      >
        {canLeft ? (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 sm:w-12"
            style={{ background: "linear-gradient(to right, var(--color-bg-subtle), transparent)" }}
            aria-hidden
          />
        ) : null}
        {canRight ? (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 sm:w-12"
            style={{ background: "linear-gradient(to left, var(--color-bg-subtle), transparent)" }}
            aria-hidden
          />
        ) : null}

        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={!canLeft}
          aria-label="Previous Tabs"
          className={cn(
            "absolute top-1/2 left-1 z-[2] grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg-elevated text-fg shadow-sm transition-opacity touch-manipulation sm:size-9",
            canLeft ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={!canRight}
          aria-label="Next Tabs"
          className={cn(
            "absolute top-1/2 right-1 z-[2] grid size-8 -translate-y-1/2 place-items-center rounded-full border border-border bg-bg-elevated text-fg shadow-sm transition-opacity touch-manipulation sm:size-9",
            canRight ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <ChevronRight className="size-4" />
        </button>

        <div
          ref={scrollerRef}
          className="scroll-x flex gap-1 px-10 py-1.5 sm:px-12"
          role="tablist"
          aria-label="Ledger Sections"
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = value === id;
            const count = badges?.[id] ?? 0;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                data-tab-id={id}
                onClick={() => onChange(id)}
                className={cn(
                  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 font-medium whitespace-nowrap transition-colors touch-manipulation",
                  compact ? "min-h-11 py-2 text-xs" : "min-h-10 py-2 text-sm",
                  active
                    ? "bg-bg-elevated text-fg shadow-sm"
                    : "text-fg-muted hover:bg-bg-elevated/60 hover:text-fg",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{label}</span>
                {count > 0 ? (
                  <span
                    className={cn(
                      "grid min-h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold",
                      id === "perks"
                        ? "bg-success text-white"
                        : "bg-primary text-primary-fg",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="mx-auto mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-border sm:w-20"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-primary transition-[margin,width] duration-150"
          style={{
            width: `${Math.max(22, progress.width * 100)}%`,
            marginLeft: `${progress.left * (100 - Math.max(22, progress.width * 100))}%`,
          }}
        />
      </div>
    </div>
  );
}
