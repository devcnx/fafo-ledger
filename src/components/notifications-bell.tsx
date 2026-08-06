import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/lib/ledger-context";
import { formatDateTime } from "@/lib/utils";

export function NotificationsBell({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { notifications, markNotificationsRead } = useLedger();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="relative"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-fg">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 sm:hidden"
            aria-label="Close Notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full right-0 z-40 mt-2 w-[min(calc(100vw-1.5rem),20rem)] rounded-xl border border-border bg-bg-elevated p-2 shadow-lg">
            <div className="mb-2 flex min-h-10 items-center justify-between px-2">
              <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                Notifications
              </p>
              {unread > 0 ? (
                <button
                  type="button"
                  className="min-h-10 px-2 text-xs font-medium text-primary"
                  onClick={() => void markNotificationsRead({ all: true })}
                >
                  Mark All Read
                </button>
              ) : null}
            </div>
            <ul className="max-h-[min(50dvh,18rem)] space-y-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <li className="px-2 py-6 text-center text-sm text-fg-muted">No Notifications Yet.</li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`w-full rounded-lg px-2.5 py-2.5 text-left transition-colors active:bg-bg-subtle ${
                        n.read ? "opacity-70" : "bg-primary-soft/40"
                      }`}
                      onClick={() => {
                        if (!n.read) void markNotificationsRead({ ids: [n.id] });
                        if (n.href && onNavigate) onNavigate(n.href);
                        setOpen(false);
                      }}
                    >
                      <p className="text-sm font-medium text-fg">{n.title}</p>
                      {n.body ? <p className="mt-0.5 text-xs text-fg-muted line-clamp-2">{n.body}</p> : null}
                      <p className="mt-1 text-[11px] text-fg-subtle">{formatDateTime(n.createdAt)}</p>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
