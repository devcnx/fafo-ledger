import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { addCentralDays } from "@/lib/find-out";
import { useLedger } from "@/lib/ledger-context";
import { formatDate } from "@/lib/utils";

export function BargainBlock({ findOutId, mineItem, iIssued }: { findOutId: string; mineItem: boolean; iIssued: boolean }) {
  const { bargains, proposeBargain, decideBargain } = useLedger();
  const offers = bargains.filter((b) => b.findOutId === findOutId);
  const pending = offers.filter((b) => b.status === "pending");
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([
    { title: "", body: "", dueDate: addCentralDays(7) },
    { title: "", body: "", dueDate: addCentralDays(7) },
  ]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const filled = rows.filter((r) => r.title.trim()).slice(0, 3);
    if (filled.length === 0) return toast.error("Propose At Least One Alternative.");
    setBusy(true);
    try {
      await proposeBargain({ findOutId, offers: filled });
      setOpen(false);
      toast.success("Bargain Sent. They Pick Or Keep The Original.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Propose");
    } finally {
      setBusy(false);
    }
  }

  if (pending.length > 0) {
    return (
      <div className="rounded-lg border border-warn/40 bg-warn-soft/40 p-3">
        <p className="text-xs font-semibold tracking-wide text-warn uppercase">Sentencing Bargain</p>
        <ul className="mt-2 space-y-2">
          {pending.map((o) => (
            <li key={o.id} className="rounded-lg border border-border bg-bg-elevated p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warn">Pending</Badge>
                {o.dueDate ? <span className="text-xs text-fg-muted">Due {formatDate(o.dueDate)}</span> : null}
              </div>
              <p className="mt-1 text-sm font-semibold text-fg">{o.title}</p>
              {o.body ? <p className="text-xs text-fg-muted">{o.body}</p> : null}
              {iIssued ? (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    void decideBargain({ findOutId, offerId: o.id }).then(() =>
                      toast.success("Bargain Accepted. Sentence Replaced."),
                    )
                  }
                >
                  Accept This One
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {iIssued ? (
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() =>
              void decideBargain({ findOutId, rejectAll: true }).then(() => toast.message("Bargain Rejected."))
            }
          >
            Reject All — Keep Original
          </Button>
        ) : (
          <p className="mt-2 text-xs text-fg-subtle">Waiting On Them To Pick.</p>
        )}
      </div>
    );
  }

  if (!mineItem) return null;

  return (
    <div className="rounded-lg border border-border p-3">
      {!open ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Propose A Bargain
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
            Offer 1–3 Alternatives
          </p>
          {rows.map((r, i) => (
            <div key={i} className="space-y-1.5 rounded-lg bg-bg-subtle p-2.5">
              <Label>Option {i + 1}</Label>
              <Input
                value={r.title}
                placeholder="Alternative Sentence"
                onChange={(e) =>
                  setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))
                }
              />
              <Textarea
                value={r.body}
                placeholder="Details"
                className="min-h-14"
                onChange={(e) =>
                  setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, body: e.target.value } : x)))
                }
              />
              <Input
                type="date"
                value={r.dueDate}
                onChange={(e) =>
                  setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, dueDate: e.target.value } : x)))
                }
              />
            </div>
          ))}
          {rows.length < 3 ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRows((prev) => [...prev, { title: "", body: "", dueDate: addCentralDays(7) }])}
            >
              Add A Third
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void submit()} disabled={busy}>
              {busy ? "Sending…" : "Send Bargain"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
