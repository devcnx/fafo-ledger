import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PIN_STORAGE_KEY } from "@/lib/constants";
import { hashPin } from "@/lib/evidence";

/**
 * Optional client-side PIN after login. Stored as SHA-256 in localStorage.
 */
export function PinGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [setupMode, setSetupMode] = useState(false);
  const [setupA, setSetupA] = useState("");
  const [setupB, setSetupB] = useState("");

  useEffect(() => {
    const hash = localStorage.getItem(PIN_STORAGE_KEY);
    const unlocked = sessionStorage.getItem("fafo-pin-ok") === "1";
    setLocked(Boolean(hash) && !unlocked);
    setReady(true);
  }, []);

  async function unlock() {
    const stored = localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) {
      setLocked(false);
      return;
    }
    const h = await hashPin(pin);
    if (h === stored) {
      sessionStorage.setItem("fafo-pin-ok", "1");
      setLocked(false);
      setError("");
      setPin("");
    } else {
      setError("Wrong PIN.");
    }
  }

  async function savePin() {
    if (setupA.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    if (setupA !== setupB) {
      setError("PINs Don’t Match.");
      return;
    }
    const h = await hashPin(setupA);
    localStorage.setItem(PIN_STORAGE_KEY, h);
    sessionStorage.setItem("fafo-pin-ok", "1");
    setSetupMode(false);
    setSetupA("");
    setSetupB("");
    setError("");
    setLocked(false);
  }

  if (!ready) return null;

  if (locked) {
    return (
      <main className="grid min-h-[calc(100dvh-var(--grok-banner-h,0px))] place-items-center bg-bg px-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-bg-elevated p-6 shadow-md">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-fg">
              <Lock className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-semibold">PIN Lock</h1>
              <p className="text-sm text-fg-muted">Extra Privacy After Login.</p>
            </div>
          </div>
          <div>
            <Label htmlFor="pin">Enter PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void unlock()}
              autoFocus
            />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button className="w-full" onClick={() => void unlock()}>
            Unlock
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      {children}
      {setupMode ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-bg-elevated p-6 shadow-lg">
            <h2 className="font-display text-lg font-semibold">Set PIN</h2>
            <p className="text-sm text-fg-muted">
              Optional second lock on this device. Stored only in this browser.
            </p>
            <div>
              <Label>New PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                value={setupA}
                onChange={(e) => setSetupA(e.target.value)}
              />
            </div>
            <div>
              <Label>Confirm PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                value={setupB}
                onChange={(e) => setSetupB(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setSetupMode(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => void savePin()}>
                Save PIN
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function openPinSetup(set: (v: boolean) => void) {
  set(true);
}

export function clearPin() {
  localStorage.removeItem(PIN_STORAGE_KEY);
  sessionStorage.removeItem("fafo-pin-ok");
}

export function usePinControls() {
  const [setupOpen, setSetupOpen] = useState(false);
  return {
    setupOpen,
    setSetupOpen,
    clearPin,
    hasPin: typeof window !== "undefined" && Boolean(localStorage.getItem(PIN_STORAGE_KEY)),
  };
}
