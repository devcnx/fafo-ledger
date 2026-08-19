import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Gavel, Gift, PauseCircle, Scale, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { installDismissKey, isTruceActive } from "@/lib/house-economy";
import { useLedger } from "@/lib/ledger-context";
import { formatDate, toCentralYmd } from "@/lib/utils";

export function TruceBanner() {
  const { truceUntil, truceNote, clearTruce, isOwner, role } = useLedger();
  if (!isTruceActive(truceUntil)) return null;
  return (
    <Card className="mb-4 border-success/40 bg-success-soft/50">
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <PauseCircle className="size-4 shrink-0" />
            Truce Through {formatDate(truceUntil!)}
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">
            {truceNote || "Logging Is Frozen. Open Find Out Dates Are Paused."}
          </p>
        </div>
        {isOwner || role === "tracker" ? (
          <Button size="sm" variant="outline" onClick={() => void clearTruce().then(() => toast.success("Truce Lifted."))}>
            End Truce
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ParoleBanner({ onOpen }: { onOpen: () => void }) {
  const { paroles, role } = useLedger();
  if (!role) return null;
  const mine = paroles.filter((p) => p.role === role);
  if (mine.length === 0) return null;
  const first = mine[0];
  return (
    <Card className="mb-4 border-warn/50 bg-warn-soft/60">
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-warn">
            <Scale className="size-4 shrink-0" />
            You Are On Parole
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">
            {first.category} Through {formatDate(first.endsOn)}
            {mine.length > 1 ? ` · +${mine.length - 1} More` : ""}. Next FA In These Categories Hits Harder.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onOpen}>
          Open The Docket
        </Button>
      </CardContent>
    </Card>
  );
}

export function AmnestyBanner({ onOpen }: { onOpen: () => void }) {
  const { amnestyOn, findOuts, role } = useLedger();
  const today = toCentralYmd(new Date());
  if (!amnestyOn || amnestyOn !== today) return null;
  const open = findOuts.filter((f) => f.status === "issued" || f.status === "acknowledged" || f.status === "appealed");
  if (!role || open.length === 0) return null;
  return (
    <Card className="mb-4 border-primary/40">
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Gavel className="size-4 shrink-0" />
            Anniversary Amnesty Is Open
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">
            Waive One Open Find Out Today. Use It Or Lose It.
          </p>
        </div>
        <Button size="sm" onClick={onOpen}>
          Pick One To Waive
        </Button>
      </CardContent>
    </Card>
  );
}

export function PeaceBanner({ onOpen }: { onOpen: () => void }) {
  const { peaceStreaks, role, perks } = useLedger();
  if (!role) return null;
  const mine = peaceStreaks.find((s) => s.role === role);
  if (!mine || mine.days < 3) return null;
  const recent = perks.filter((p) => p.source === "peace_streak" && p.assignedToRole === role).slice(0, 1);
  return (
    <Card className="mb-4 border-success/30">
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <Gift className="size-4 shrink-0" />
            {mine.days === 999 ? "Clean Streak" : `${mine.days}-Day Peace Streak`}
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">
            {mine.nextMilestone
              ? `${mine.daysUntilNext} Day${mine.daysUntilNext === 1 ? "" : "s"} To A ${mine.nextMilestone}-Day Perk.`
              : recent[0]
                ? `Latest Payout: ${recent[0].title}`
                : "You Cleared The Board. Stay There."}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onOpen}>
          Perk Bank
        </Button>
      </CardContent>
    </Card>
  );
}

export function InstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (standalone) return;
    if (localStorage.getItem(installDismissKey())) return;
    setShow(true);
  }, []);
  if (!show) return null;
  return (
    <Card className="mb-4 border-border">
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Smartphone className="size-4 shrink-0" />
            Add To Home Screen
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">
            One Tap To Log. Share → Add To Home Screen. Works Like An App.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            localStorage.setItem(installDismissKey(), "1");
            setShow(false);
          }}
        >
          Dismiss
        </Button>
      </CardContent>
    </Card>
  );
}
