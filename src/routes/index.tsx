import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PinGate } from "@/components/pin-gate";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { LedgerProvider } from "@/lib/ledger-context";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return (
      <main className="grid min-h-[calc(100dvh-var(--grok-banner-h,0px))] place-items-center bg-bg">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-48 animate-pulse rounded-xl bg-bg-subtle" />
          <p className="text-sm text-fg-muted">Checking Session…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <RedirectToSignIn />;
  }

  return (
    <LedgerProvider>
      <PinGate>
        <AppShell />
      </PinGate>
    </LedgerProvider>
  );
}
