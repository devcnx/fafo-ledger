export type AppRole = "tracker" | "subject";
export type HouseholdMode = "solo" | "couple";

/** Stable id for Brittaney & Michael's household — never change this. */
export const LEGACY_HOUSEHOLD_ID = "hh-perry-lucido";

/**
 * Seed identities for the original Perry–Lucido ledger.
 * These accounts keep all existing data; membership is tied by email.
 */
export const LEGACY_HOUSEHOLD = {
  id: LEGACY_HOUSEHOLD_ID,
  name: "Perry–Lucido Ledger",
  inviteCode: "FAFO0616",
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

/** @deprecated Use LEGACY_HOUSEHOLD — kept so older imports don't break mid-refactor. */
export const HOUSEHOLD = {
  tracker: LEGACY_HOUSEHOLD.tracker,
  subject: LEGACY_HOUSEHOLD.subject,
} as const;

export function roleLabel(role: AppRole, profile?: { trackerName: string; subjectName: string }) {
  if (role === "tracker") return profile?.trackerName?.split(" ")[0] ?? "Tracker";
  return profile?.subjectName?.split(" ")[0] ?? "Partner";
}
