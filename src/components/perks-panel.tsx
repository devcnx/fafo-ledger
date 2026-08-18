import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Gift, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { PERK_SUGGESTIONS } from "@/lib/constants";
import { addCentralDays } from "@/lib/find-out";
import { useLedger } from "@/lib/ledger-context";
import {
  isPerkExpired,
  isPerkSpendable,
  perkBadgeVariant,
  perkKindLabel,
  perkStatusLabel,
} from "@/lib/perks";
import type { Perk, PerkKind } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function PerksPanel() {
  const { perks, profile, role, grantPerk, resolvePerk } = useLedger();
  const otherRole = role === "tracker" ? "subject" : "tracker";
  const otherName = otherRole === "subject" ? profile.subjectName : profile.trackerName;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PerkKind>("favor");
  const [expiresOn, setExpiresOn] = useState(addCentralDays(14));
  const [busy, setBusy] = useState(false);

  const mine = useMemo(
    () => perks.filter((p) => p.assignedToRole === role),
    [perks, role],
  );
  const issued = useMemo(
    () => perks.filter((p) => p.grantedByRole === role),
    [perks, role],
  );
  const bank = mine.filter(isPerkSpendable);
  const pendingHonor = issued.filter((p) => p.status === "pending");

  async function grant() {
    if (!title.trim()) return toast.error("Name The Perk.");
    setBusy(true);
    try {
      await grantPerk({
        title: title.trim(),
        body: body.trim(),
        kind,
        expiresOn: expiresOn || null,
      });
      setTitle("");
      setBody("");
      toast.success(`Perk Banked For ${otherName.split(" ")[0]}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Grant Perk");
    } finally {
      setBusy(false);
    }
  }

  function applySuggestion(s: (typeof PERK_SUGGESTIONS)[number]) {
    setTitle(s.title);
    setBody(s.body);
    setKind(s.kind);
    setExpiresOn(addCentralDays(s.expiresDays));
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-success/30">
        <div className="bg-success-soft px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-success uppercase">
            The Perk Bank
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-fg">
            Good Behavior Has A Bill Too.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-fg-muted">
            Love Is a Receipt. A Perk Is Spendable. Grant One, They Cash It In, You Honor It —
            Or They Burn a Jail Pass On an Open Find Out.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="success">{bank.length} In Your Bank</Badge>
            <Badge variant="warn">{pendingHonor.length} Waiting On You</Badge>
            <Badge variant="muted">
              {perks.filter((p) => p.status === "redeemed").length} Cashed In
            </Badge>
          </div>
        </div>
      </Card>

      <PerkList
        heading="Your Bank"
        empty="No Perks In Your Bank. Serve a Find Out — Or Be Unbearably Charming."
        items={mine}
        role={role}
        profile={profile}
        resolvePerk={resolvePerk}
      />

      {pendingHonor.length > 0 ? (
        <PerkList
          heading="Honor These"
          empty=""
          items={pendingHonor}
          role={role}
          profile={profile}
          resolvePerk={resolvePerk}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="size-5 text-primary" />
            Grant A Perk
          </CardTitle>
          <CardDescription>
            For {otherName.split(" ")[0]}. Opposite Of a Find Out — They Can Cash This In.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Quick Perks</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PERK_SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-bg-elevated px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:border-primary hover:text-primary"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>The Perk</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What They Get To Cash In"
            />
          </div>
          <div>
            <Label>Details</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Spell Out What You Owe. No Wiggle Room."
              className="min-h-16"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Kind</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as PerkKind)}
                className="field-control"
              >
                <option value="favor">Favor</option>
                <option value="pass">Pass</option>
                <option value="date">Date</option>
                <option value="jail_pass">Jail Pass</option>
              </select>
            </div>
            <div>
              <Label>Expires (Central)</Label>
              <Input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => void grant()} disabled={busy} className="w-full sm:w-auto">
            {busy ? "Banking…" : `Bank It For ${otherName.split(" ")[0]}`}
          </Button>
        </CardContent>
      </Card>

      {issued.filter((p) => !mine.some((m) => m.id === p.id)).length > 0 ? (
        <PerkList
          heading="Issued By You"
          empty="You Haven't Granted Any Perks Yet."
          items={issued.filter(
            (p) => p.status !== "pending" && !mine.some((m) => m.id === p.id),
          )}
          role={role}
          profile={profile}
          resolvePerk={resolvePerk}
        />
      ) : null}
    </div>
  );
}

function PerkList({
  heading,
  empty,
  items,
  role,
  profile,
  resolvePerk,
}: {
  heading: string;
  empty: string;
  items: Perk[];
  role: "tracker" | "subject" | null;
  profile: { trackerName: string; subjectName: string };
  resolvePerk: (input: {
    id: string;
    action: "redeem" | "honor" | "bounce" | "revoke";
    note?: string;
  }) => Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{heading}</CardTitle>
        </CardHeader>
        <CardContent className="pb-6 text-sm text-fg-muted">{empty}</CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      <h3 className="px-1 text-sm font-semibold tracking-wide text-fg-muted uppercase">
        {heading}
      </h3>
      <ul className="space-y-3">
        {items.map((p) => (
          <li key={p.id}>
            <PerkCard p={p} role={role} profile={profile} resolvePerk={resolvePerk} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PerkCard({
  p,
  role,
  profile,
  resolvePerk,
}: {
  p: Perk;
  role: "tracker" | "subject" | null;
  profile: { trackerName: string; subjectName: string };
  resolvePerk: (input: {
    id: string;
    action: "redeem" | "honor" | "bounce" | "revoke";
    note?: string;
  }) => Promise<void>;
}) {
  const holder = p.assignedToRole === "tracker" ? profile.trackerName : profile.subjectName;
  const grantor = p.grantedByRole === "tracker" ? profile.trackerName : profile.subjectName;
  const mine = p.assignedToRole === role;
  const iGranted = p.grantedByRole === role;
  const expired = isPerkExpired(p);

  return (
    <Card className={p.kind === "jail_pass" && p.status === "available" ? "border-danger/40" : undefined}>
      <CardContent className="space-y-2 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={perkBadgeVariant(p)}>
            {expired ? "Expired" : perkStatusLabel(p.status)}
          </Badge>
          <Badge variant="outline">{perkKindLabel(p.kind)}</Badge>
          <Badge variant="muted">→ {holder.split(" ")[0]}</Badge>
          <span className="text-xs text-fg-subtle">From {grantor.split(" ")[0]}</span>
          {p.expiresOn ? (
            <span className="text-xs text-fg-muted">Expires {formatDate(p.expiresOn)}</span>
          ) : null}
        </div>
        <h4 className="flex items-center gap-2 font-semibold text-fg">
          <Ticket className="size-4 shrink-0 text-primary" />
          {p.title}
        </h4>
        {p.body ? <p className="whitespace-pre-wrap text-sm text-fg-muted">{p.body}</p> : null}
        {p.honorNote ? (
          <p className="border-l-2 border-primary/40 pl-3 text-sm text-fg">Note: {p.honorNote}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 pt-1 sm:flex sm:flex-wrap">
          {mine && isPerkSpendable(p) ? (
            <Button
              size="sm"
              onClick={() =>
                void resolvePerk({ id: p.id, action: "redeem" })
                  .then(() =>
                    toast.success(
                      p.kind === "jail_pass"
                        ? "Jail Pass Cashed. Find Out Waived."
                        : "Cash-In Sent. They Have To Honor It.",
                    ),
                  )
                  .catch((e) => toast.error(e instanceof Error ? e.message : "Could Not Cash In"))
              }
            >
              {p.kind === "jail_pass" ? "Cash Jail Pass" : "Cash It In"}
            </Button>
          ) : null}
          {iGranted && p.status === "pending" ? (
            <>
              <Button
                size="sm"
                onClick={() =>
                  void resolvePerk({ id: p.id, action: "honor" }).then(() =>
                    toast.success("Honored. Debt Paid."),
                  )
                }
              >
                Honor It
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void resolvePerk({ id: p.id, action: "bounce" }).then(() =>
                    toast.success("Bounced. Still In Their Bank."),
                  )
                }
              >
                Bounce It
              </Button>
            </>
          ) : null}
          {iGranted && p.status === "available" && !expired ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                void resolvePerk({ id: p.id, action: "revoke" }).then(() =>
                  toast.success("Revoked."),
                )
              }
            >
              Revoke
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
