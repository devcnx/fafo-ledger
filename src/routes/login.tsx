import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { APP_NAME } from "@/lib/constants";
import { bootstrapLedger } from "@/lib/ledger";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void bootstrapLedger().catch(() => {
      /* seed best-effort */
    });
  }, []);

  useEffect(() => {
    if (!isPending && user) {
      void navigate({ to: "/" });
    }
  }, [user, isPending, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authEnabled) {
      toast.error("Sign-In Is Disabled.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) {
          toast.error("Enter Your Name.");
          return;
        }
        if (password.length < 8) {
          toast.error("Password Must Be at Least 8 Characters.");
          return;
        }
        const { error } = await authClient.signUp.email({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
        });
        if (error) {
          toast.error(error.message ?? "Sign-Up Failed");
          return;
        }
        toast.success("Account Created. Welcome.");
      } else {
        const { error } = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          toast.error(error.message ?? "Sign-In Failed");
          return;
        }
        toast.success("Signed In.");
      }
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending) {
    return (
      <main className="grid min-h-[calc(100dvh-var(--grok-banner-h,0px))] place-items-center bg-bg">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-bg-subtle" />
      </main>
    );
  }

  return (
    <main className="grid min-h-[calc(100dvh-var(--grok-banner-h,0px))] place-items-center bg-bg px-3 py-8 sm:px-4 sm:py-10">
      <Card className="w-full max-w-sm sm:max-w-md">
        <CardHeader className="items-center text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-fg">
            <ShieldAlert className="size-6" />
          </span>
          <CardTitle className="mt-2">{APP_NAME}</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Private Household Ledgers. Sign In to Continue."
              : "Create Your Account. Then Set Up Solo or Couple Mode."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-bg-subtle p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === "signin" ? "bg-bg-elevated text-fg shadow-sm" : "text-fg-muted"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                mode === "signup" ? "bg-bg-elevated text-fg shadow-sm" : "text-fg-muted"
              }`}
            >
              Sign Up
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" ? (
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First Last"
                  required
                />
              </div>
            ) : null}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "signup" ? 8 : undefined}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? mode === "signup"
                  ? "Creating…"
                  : "Signing In…"
                : mode === "signup"
                  ? "Create Account"
                  : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Toaster position="bottom-center" />
    </main>
  );
}
