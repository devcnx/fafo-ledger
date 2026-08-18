import { toast } from "sonner";
import { Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isFindOutOpen, isFindOutOverdue } from "@/lib/find-out";
import { useLedger } from "@/lib/ledger-context";
import { formatDate } from "@/lib/utils";

export function FoWarrant({ onOpen }: { onOpen: () => void }) {
  const { findOuts, role, resolveFindOut } = useLedger();
  if (!role) return null;

  const mine = findOuts.filter((f) => f.assignedToRole === role && isFindOutOpen(f));
  if (mine.length === 0) return null;

  const first = mine[0];
  const late = mine.filter(isFindOutOverdue).length;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-danger/40 bg-danger-soft">
      <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Siren className="size-4 shrink-0 text-danger" />
            <p className="text-sm font-semibold text-danger">You Found Out</p>
            <Badge variant="danger">
              {mine.length} Open Sentence{mine.length === 1 ? "" : "s"}
            </Badge>
            {late > 0 ? <Badge variant="danger">{late} Overdue</Badge> : null}
          </div>
          <p className="mt-1 truncate text-sm text-fg">
            {first.title}
            {first.dueDate ? ` · Due ${formatDate(first.dueDate)}` : ""}
            {mine.length > 1 ? ` · +${mine.length - 1} More` : ""}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Logging Was the FA. This Is the FO. Acknowledge It, Then Serve It.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          {first.status === "issued" ? (
            <Button
              size="sm"
              variant="soft"
              onClick={() =>
                void resolveFindOut({ id: first.id, action: "acknowledge" }).then(() =>
                  toast.success("Acknowledged. Now Serve It."),
                )
              }
            >
              I Found Out
            </Button>
          ) : null}
          <Button size="sm" onClick={onOpen}>
            Open The Docket
          </Button>
        </div>
      </div>
    </div>
  );
}
