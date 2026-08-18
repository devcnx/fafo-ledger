import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLedger } from "@/lib/ledger-context";
import { isPerkSpendable } from "@/lib/perks";

export function PerkBank({ onOpen }: { onOpen: () => void }) {
  const { perks, role, resolvePerk } = useLedger();
  if (!role) return null;
  const spendable = perks.filter((p) => p.assignedToRole === role && isPerkSpendable(p));
  const pendingHonor = perks.filter((p) => p.grantedByRole === role && p.status === "pending");
  if (spendable.length === 0 && pendingHonor.length === 0) return null;

  const first = spendable[0];

  return (
    <Card className="mb-4 border-success/40 bg-success-soft/50">
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <Gift className="size-4 shrink-0" />
            {spendable.length > 0
              ? `You Have ${spendable.length} Perk${spendable.length === 1 ? "" : "s"} In The Bank`
              : `${pendingHonor.length} Cash-In${pendingHonor.length === 1 ? "" : "s"} Waiting`}
          </p>
          <p className="mt-0.5 truncate text-sm text-fg-muted">
            {first
              ? `${first.title}${spendable.length > 1 ? ` · And ${spendable.length - 1} More` : ""}`
              : "Honor What You Promised."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          {first ? (
            <Button
              size="sm"
              onClick={() =>
                void resolvePerk({ id: first.id, action: "redeem" }).catch(() => onOpen())
              }
            >
              {first.kind === "jail_pass" ? "Cash Jail Pass" : "Cash It In"}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onOpen}>
            Open The Bank
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
