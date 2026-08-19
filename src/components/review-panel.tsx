import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLedger } from "@/lib/ledger-context";
import { buildReview, type ReviewPeriod, type ReviewStats } from "@/lib/review";
import { isFindOutOpen } from "@/lib/find-out";
import { isPerkSpendable } from "@/lib/perks";
import { formatDate } from "@/lib/utils";

export function ReviewPanel() {
  const { offenses, findOuts, perks, quotes, profile, role, peaceStreaks } = useLedger();
  const [period, setPeriod] = useState<ReviewPeriod>("month");
  const stats = useMemo(
    () => buildReview(period, { offenses, findOuts, perks, quotes }),
    [period, offenses, findOuts, perks, quotes],
  );
  const mine = role ? stats.byRole[role] : null;
  const streak = peaceStreaks.find((s) => s.role === role);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={period === "month" ? "default" : "outline"} onClick={() => setPeriod("month")}>
          This Month
        </Button>
        <Button size="sm" variant={period === "year" ? "default" : "outline"} onClick={() => setPeriod("year")}>
          This Year
        </Button>
      </div>

      <Card className="overflow-hidden border-primary/20">
        <div className="bg-primary px-5 py-6 text-primary-fg sm:px-8">
          <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-80">The Roast</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {stats.label} In Review
          </h2>
          <p className="mt-2 max-w-xl text-sm opacity-90">
            {profile.trackerName.split(" ")[0]} ⇄ {profile.subjectName.split(" ")[0]}. The Numbers Do Not Care About Your Feelings.
          </p>
        </div>
        <CardContent className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
          <Stat label="FA Logged" value={String(stats.faLogged)} />
          <Stat label="FO Served" value={`${stats.foServed}/${stats.foIssued}`} />
          <Stat label="Perks Earned" value={String(stats.perksEarned)} />
          <Stat label="Perks Burned" value={String(stats.perksBurned)} />
          <Stat label="Longest Peace" value={`${stats.longestPeace}d`} />
          <Stat label="Nuclear" value={String(stats.nuclear)} />
          <Stat label="FO Waived" value={String(stats.foWaived)} />
          <Stat
            label="Top Category"
            value={stats.topCategory ? `${stats.topCategory.count}` : "—"}
            hint={stats.topCategory?.name}
          />
        </CardContent>
      </Card>

      {stats.worstWeek ? (
        <Card>
          <CardHeader>
            <CardTitle>Worst Week</CardTitle>
            <CardDescription>Week Of {formatDate(stats.worstWeek.start)}.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold text-primary tabular-nums">
              {stats.worstWeek.count} FA
            </p>
          </CardContent>
        </Card>
      ) : null}

      {stats.quoteOfPeriod ? (
        <Card>
          <CardHeader>
            <CardTitle>Quote Of The {period === "month" ? "Month" : "Year"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-xl leading-snug">“{stats.quoteOfPeriod}”</p>
          </CardContent>
        </Card>
      ) : null}

      {mine ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Side</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>{mine.faAgainst} FA Against You</Badge>
            <Badge variant="success">{mine.foServed} FO You Served</Badge>
            <Badge variant="outline">{mine.perksEarned} Perks Earned</Badge>
            {streak ? <Badge variant="warn">{streak.days === 999 ? "Clean" : `${streak.days}d`} Streak</Badge> : null}
          </CardContent>
        </Card>
      ) : null}

      <RapSheetCard stats={stats} />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <p className="text-[11px] font-medium tracking-wide text-fg-muted uppercase">{label}</p>
      <p className="font-display text-2xl font-semibold tabular-nums text-fg">{value}</p>
      {hint ? <p className="truncate text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

function RapSheetCard({ stats }: { stats: ReviewStats }) {
  const { profile, findOuts, perks, role, peaceStreaks } = useLedger();
  const [busy, setBusy] = useState(false);

  function download() {
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No Canvas");
      const openFo = findOuts.filter(isFindOutOpen).length;
      const bank = role ? perks.filter((p) => p.assignedToRole === role && isPerkSpendable(p)).length : 0;
      const streak = peaceStreaks.find((s) => s.role === role);
      const burned = perks.filter((p) => p.status === "burned").length;

      ctx.fillStyle = "#1c1412";
      ctx.fillRect(0, 0, 1080, 1350);
      ctx.fillStyle = "#b8331d";
      ctx.fillRect(0, 0, 1080, 220);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 28px Georgia, serif";
      ctx.fillText("FAFO LEDGER", 72, 90);
      ctx.font = "600 56px Georgia, serif";
      ctx.fillText("Rap Sheet", 72, 160);

      ctx.fillStyle = "#f5ece7";
      ctx.font = "500 28px sans-serif";
      ctx.fillText(`${profile.trackerName.split(" ")[0]}  ⇄  ${profile.subjectName.split(" ")[0]}`, 72, 300);
      ctx.font = "400 22px sans-serif";
      ctx.fillStyle = "#b5a49c";
      ctx.fillText(stats.label, 72, 340);

      const rows: [string, string][] = [
        ["Open Warrants", String(openFo)],
        ["FA This Period", String(stats.faLogged)],
        ["FO Served", `${stats.foServed} / ${stats.foIssued}`],
        ["Perk Bank", String(bank)],
        ["Perks Burned", String(burned)],
        ["Peace Streak", streak ? (streak.days === 999 ? "Clean" : `${streak.days} Days`) : "—"],
        ["Top Category", stats.topCategory ? `${stats.topCategory.name} ×${stats.topCategory.count}` : "None"],
        ["Nuclear Hits", String(stats.nuclear)],
      ];
      rows.forEach(([k, v], i) => {
        const y = 430 + i * 88;
        ctx.fillStyle = "#241f1c";
        ctx.fillRect(72, y - 48, 936, 76);
        ctx.fillStyle = "#9a877f";
        ctx.font = "600 20px sans-serif";
        ctx.fillText(k.toUpperCase(), 96, y - 8);
        ctx.fillStyle = "#f5ece7";
        ctx.font = "600 32px Georgia, serif";
        ctx.fillText(v, 96, y + 28);
      });

      ctx.fillStyle = "#b8331d";
      ctx.font = "600 18px sans-serif";
      ctx.fillText("FUCK AROUND AND FIND OUT — WITH RECEIPTS.", 72, 1280);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fafo-rap-sheet-${stats.period}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Rap Sheet Saved.");
      }, "image/png");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Draw The Sheet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shareable Rap Sheet</CardTitle>
        <CardDescription>One Image. Open Warrants, Streak, Bank, Burns. Lock-Screen Energy.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={download} disabled={busy}>
          {busy ? "Drawing…" : "Download Rap Sheet"}
        </Button>
      </CardContent>
    </Card>
  );
}
