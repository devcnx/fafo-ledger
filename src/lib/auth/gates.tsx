import type { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { authEnabled, signOut } from "./client";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";

/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present (real session, or the disabled-auth dev user). */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/**
 * Render children only once we KNOW the visitor is signed out (`isPending` has
 * cleared and there is no user). Hidden while the session is still loading.
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

/**
 * Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
 * `window.location` reload).
 */
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}

/**
 * Compact identity chip + sign-out. Icon-first on small screens.
 */
export function UserButton() {
  const user = useCurrentUser();
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  const initial = label.charAt(0).toUpperCase();
  return (
    <div className="flex max-w-[11rem] items-center gap-1.5 rounded-xl border border-border bg-bg px-1.5 py-1 sm:max-w-none sm:gap-2 sm:px-2 sm:py-1.5">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="size-8 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-sm font-semibold text-primary">
          {initial}
        </span>
      )}
      <span className="hidden min-w-0 truncate text-sm font-medium text-fg sm:inline">
        {label.split(" ")[0]}
      </span>
      {authEnabled ? (
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-lg px-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg active:bg-bg-subtle sm:min-w-0 sm:px-2"
          aria-label="Sign Out"
          title="Sign Out"
        >
          <LogOut className="size-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      ) : null}
    </div>
  );
}
