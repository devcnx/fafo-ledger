export type AppRole = "tracker" | "subject";

/** Hardcoded household accounts for this private ledger. */
export const HOUSEHOLD = {
  tracker: {
    email: "bperrymorgan@me.com",
    name: "Brittaney Perry-Morgan",
    role: "tracker" as const,
  },
  subject: {
    email: "spacehoodstalian@gmail.com",
    name: "Michael Lucido",
    role: "subject" as const,
  },
} as const;

const byEmail: Record<string, { name: string; role: AppRole }> = {
  [HOUSEHOLD.tracker.email]: {
    name: HOUSEHOLD.tracker.name,
    role: HOUSEHOLD.tracker.role,
  },
  [HOUSEHOLD.subject.email]: {
    name: HOUSEHOLD.subject.name,
    role: HOUSEHOLD.subject.role,
  },
};

export function roleForEmail(email: string | null | undefined): AppRole | null {
  if (!email) return null;
  return byEmail[email.trim().toLowerCase()]?.role ?? null;
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  return roleForEmail(email) !== null;
}

export function displayNameForEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return byEmail[email.trim().toLowerCase()]?.name ?? null;
}
