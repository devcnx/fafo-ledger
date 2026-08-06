import { useState } from "react";
import { toast } from "sonner";
import { HeartHandshake, KeyRound, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { createHousehold, joinHousehold } from "@/lib/ledger";

export function Onboarding({
  displayName,
  email,
  onDone,
}: {
  displayName: string;
  email: string;
  onDone: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"choose" | "solo" | "couple" | "join">("choose");
  const [yourName, setYourName] = useState(displayName || "");
  const [partnerName, setPartnerName] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [yourBirthday, setYourBirthday] = useState("");
  const [partnerBirthday, setPartnerBirthday] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(kind: "solo" | "couple") {
    if (!yourName.trim() || !partnerName.trim()) {
      toast.error("Enter Both Names (Use a Nickname If You’re Solo-Tracking).");
      return;
    }
    setBusy(true);
    try {
      const res = await createHousehold({
        data: {
          mode: kind,
          yourName: yourName.trim(),
          partnerName: partnerName.trim(),
          anniversary: anniversary || undefined,
          yourBirthday: yourBirthday || undefined,
          partnerBirthday: partnerBirthday || undefined,
          yourRole: "tracker",
        },
      });
      toast.success(
        kind === "couple"
          ? `Household ready. Invite code: ${res.inviteCode}`
          : "Solo ledger ready. You can invite someone later.",
      );
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Create Household");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    if (!inviteCode.trim()) {
      toast.error("Enter an Invite Code.");
      return;
    }
    setBusy(true);
    try {
      await joinHousehold({
        data: {
          inviteCode: inviteCode.trim(),
          displayName: yourName.trim() || undefined,
        },
      });
      toast.success("Joined Household. Welcome to the Ledger.");
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Join");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-3 py-6 sm:px-4 sm:py-10">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-fg">Set Up Your Ledger</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Signed In as <strong className="text-fg">{email}</strong>. Create a Household or Join with a
          Code.
        </p>
      </div>

      {mode === "choose" ? (
        <div className="grid gap-3">
          <Choice
            icon={<UserPlus className="size-5" />}
            title="Just Me (Solo)"
            body="Track One Person (or Yourself). Customize Names, Dates, and Settings. Invite a Partner Later."
            onClick={() => setMode("solo")}
          />
          <Choice
            icon={<Users className="size-5" />}
            title="Me + Someone"
            body="Start a Two-Person Household. You’ll Get an Invite Code for Them to Join and Dispute."
            onClick={() => setMode("couple")}
          />
          <Choice
            icon={<KeyRound className="size-5" />}
            title="Join with Invite Code"
            body="Your Partner Already Created a Ledger. Enter Their Code to Claim Your Seat."
            onClick={() => setMode("join")}
          />
        </div>
      ) : null}

      {(mode === "solo" || mode === "couple") && (
        <Card>
          <CardHeader>
            <CardTitle>{mode === "solo" ? "Solo Ledger" : "Couple Ledger"}</CardTitle>
            <CardDescription>
              {mode === "solo"
                ? "Name the Parties However You Want. The Second Person Can Join Later with Your Invite Code."
                : "You’re the Owner (Can Manage Settings). Share the Invite Code After Setup."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Your Name</Label>
              <Input value={yourName} onChange={(e) => setYourName(e.target.value)} />
            </div>
            <div>
              <Label>{mode === "solo" ? "Other Party Name" : "Partner Name"}</Label>
              <Input
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder={mode === "solo" ? "E.g. Them / Ex / Roommate" : "Their Full Name"}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Anniversary / Start Date (Optional)</Label>
                <Input
                  type="date"
                  value={anniversary}
                  onChange={(e) => setAnniversary(e.target.value)}
                />
              </div>
              <div>
                <Label>Your Birthday (Optional)</Label>
                <Input
                  type="date"
                  value={yourBirthday}
                  onChange={(e) => setYourBirthday(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Their Birthday (Optional)</Label>
              <Input
                type="date"
                value={partnerBirthday}
                onChange={(e) => setPartnerBirthday(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setMode("choose")}>
                Back
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => void create(mode)}>
                <HeartHandshake className="size-4" />
                {busy ? "Creating…" : "Create Ledger"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "join" ? (
        <Card>
          <CardHeader>
            <CardTitle>Join a Household</CardTitle>
            <CardDescription>Use the Invite Code from Your Partner’s Settings Tab.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Your Display Name</Label>
              <Input value={yourName} onChange={(e) => setYourName(e.target.value)} />
            </div>
            <div>
              <Label>Invite Code</Label>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="E.g. FAFO0616"
                className="font-mono tracking-widest uppercase"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setMode("choose")}>
                Back
              </Button>
              <Button className="flex-1" disabled={busy} onClick={() => void join()}>
                {busy ? "Joining…" : "Join Ledger"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function Choice({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[4.5rem] w-full items-start gap-3 rounded-2xl border border-border bg-bg-elevated p-4 text-left shadow-sm transition-colors active:border-primary sm:hover:border-primary"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      <span>
        <span className="block font-display text-base font-semibold text-fg">{title}</span>
        <span className="mt-0.5 block text-sm text-fg-muted">{body}</span>
      </span>
    </button>
  );
}
