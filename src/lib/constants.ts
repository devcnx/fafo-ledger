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
  1: "Mildly Annoying",
  2: "Annoying",
  3: "Pisses Me Off",
  4: "Makes Me Want To Slap Them",
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
  "Chores & Mess",
  "Respect",
  "Time & Flaking",
  "Hygiene",
  "Driving",
  "Money",
  "Family / Friends",
  "Tech & Phones",
  "Intimacy / Affection",
  "Lying / Omission",
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
  "Fine Otherwise",
] as const;

export const CONTEXT_OPTIONS = [
  "Work Day",
  "Weekend",
  "Morning",
  "Night",
  "In Public",
  "At Home",
  "Family Around",
  "After Drinking",
  "Travel",
  "Holiday",
] as const;

/** Starter offense templates (Title Case) — used for new households + DB repair. */
export const STARTER_TEMPLATES = [
  {
    id: "tpl-dishes",
    title: "Left Dishes In The Sink Again",
    category: "Chores & Mess",
    severity: 2 as Severity,
    description: "Dishes Left Overnight.",
    impact: "I Have To Clean Up After You.",
  },
  {
    id: "tpl-late",
    title: "Late Without A Text",
    category: "Time & Flaking",
    severity: 3 as Severity,
    description: "Showed Up Late With No Heads-Up.",
    impact: "Felt Disrespected And Anxious.",
  },
  {
    id: "tpl-phone",
    title: "Phone During Quality Time",
    category: "Tech & Phones",
    severity: 2 as Severity,
    description: "Scrolled Through The Phone While We Were Talking.",
    impact: "Felt Ignored.",
  },
  {
    id: "tpl-tone",
    title: "Tone / Attitude",
    category: "Respect",
    severity: 3 as Severity,
    description: "Snapped Or Used A Tone That Crossed A Line.",
    impact: "Felt Small / Angry.",
  },
  {
    id: "tpl-lie",
    title: "Lied Or Omitted Something",
    category: "Lying / Omission",
    severity: 4 as Severity,
    description: "Was Not Fully Honest.",
    impact: "Trust Took A Hit.",
  },
] as const;

export const APP_NAME = "FAFO Ledger";
export const APP_TAGLINE = "Fuck Around And Find Out — With Receipts.";

export const PIN_STORAGE_KEY = "fafo-pin-hash-v1";
export const THEME_STORAGE_KEY = "fafo-theme-v1";
