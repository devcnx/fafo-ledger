import type { Profile, Severity, SeverityLabels } from "./types";

export const DEFAULT_PROFILE: Profile = {
  trackerName: "Brittaney Perry-Morgan",
  subjectName: "Michael Lucido",
  anniversary: "2025-06-16",
  trackerBirthday: "1989-02-18",
  subjectBirthday: "1986-12-01",
  notes: "",
};

export const DEFAULT_SEVERITY_LABELS: Record<Severity, string> = {
  1: "Mildly annoying",
  2: "Annoying",
  3: "Pisses me off",
  4: "Makes me want to slap them",
  5: "Nuclear",
};

export const SEVERITY_META: Record<
  Severity,
  { label: string; short: string; color: string; soft: string }
> = {
  1: { label: DEFAULT_SEVERITY_LABELS[1], short: "Mild", color: "var(--color-sev-1)", soft: "var(--color-sev-1-soft)" },
  2: { label: DEFAULT_SEVERITY_LABELS[2], short: "Annoying", color: "var(--color-sev-2)", soft: "var(--color-sev-2-soft)" },
  3: { label: DEFAULT_SEVERITY_LABELS[3], short: "Pissed", color: "var(--color-sev-3)", soft: "var(--color-sev-3-soft)" },
  4: { label: DEFAULT_SEVERITY_LABELS[4], short: "Slap", color: "var(--color-sev-4)", soft: "var(--color-sev-4-soft)" },
  5: { label: DEFAULT_SEVERITY_LABELS[5], short: "Nuclear", color: "var(--color-sev-5)", soft: "var(--color-sev-5-soft)" },
};

export function severityLabel(level: Severity, custom?: SeverityLabels): string {
  return custom?.[level] || DEFAULT_SEVERITY_LABELS[level];
}

export const DEFAULT_CATEGORIES = [
  "Communication",
  "Chores & mess",
  "Respect",
  "Time & flaking",
  "Hygiene",
  "Driving",
  "Money",
  "Family / friends",
  "Tech & phones",
  "Intimacy / affection",
  "Lying / omission",
  "Other",
] as const;

export const MOOD_OPTIONS = [
  "Tired",
  "Hungry",
  "Stressed",
  "Anxious",
  "Sad",
  "Angry",
  "Overwhelmed",
  "Fine otherwise",
] as const;

export const CONTEXT_OPTIONS = [
  "Work day",
  "Weekend",
  "Morning",
  "Night",
  "In public",
  "At home",
  "Family around",
  "After drinking",
  "Travel",
  "Holiday",
] as const;

export const APP_NAME = "FAFO Ledger";
export const APP_TAGLINE = "Fuck around and find out — with receipts.";

export const PIN_STORAGE_KEY = "fafo-pin-hash-v1";
export const THEME_STORAGE_KEY = "fafo-theme-v1";
