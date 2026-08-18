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

export const PERK_SUGGESTIONS: {
  title: string;
  body: string;
  kind: import("./types").PerkKind;
  expiresDays: number;
}[] = [
  {
    title: "Breakfast In Bed",
    body: "You Stay Put. I Cook, Carry, And Clean The Tray.",
    kind: "favor",
    expiresDays: 14,
  },
  {
    title: "You Pick Dinner. I Pay.",
    body: "Your Call. I Handle Ordering, Pickup, And The Bill.",
    kind: "favor",
    expiresDays: 14,
  },
  {
    title: "Chore Pass — One Night Off",
    body: "Dishes, Trash, Counters. I Own Them. You Don't.",
    kind: "pass",
    expiresDays: 21,
  },
  {
    title: "Sleep In Saturday",
    body: "I Take Morning Duty. You Sleep Until You Decide Not To.",
    kind: "pass",
    expiresDays: 21,
  },
  {
    title: "Control The Remote",
    body: "Your Show. No Commentary. I Sit Through It.",
    kind: "pass",
    expiresDays: 14,
  },
  {
    title: "Phone-Free Date Night. I Plan It.",
    body: "I Pick The Place, Time, And Sit The Phone In The Car.",
    kind: "date",
    expiresDays: 30,
  },
  {
    title: "Massage / Back Rub",
    body: "Twenty Minutes. No Negotiating It Down To Five.",
    kind: "favor",
    expiresDays: 14,
  },
  {
    title: "Get Out Of Jail Free",
    body: "Cash This To Waive One Open Find Out. The FO Dies. The Perk Dies.",
    kind: "jail_pass",
    expiresDays: 90,
  },
  {
    title: "No Questions Asked Favor",
    body: "You Name It. I Do It. Within Reason, But I Don't Argue First.",
    kind: "favor",
    expiresDays: 30,
  },
  {
    title: "Coffee Run. Your Order.",
    body: "I Go. You Stay. I Remember The Order.",
    kind: "favor",
    expiresDays: 7,
  },
];

/** Suggested Find Outs by severity. FA without FO is just a diary. */
export const FIND_OUT_SUGGESTIONS: Record<
  Severity,
  { title: string; body: string; dueDays: number }[]
> = {
  1: [
    {
      title: "Text First Next Time. No Exceptions.",
      body: "You Fucked Around Mildly. Find Out: Heads-Up Before You're Late, Every Time.",
      dueDays: 1,
    },
    {
      title: "Do The Small Thing You Left.",
      body: "Finish What You Walked Away From. Tonight.",
      dueDays: 1,
    },
  ],
  2: [
    {
      title: "Dishes + Kitchen Reset Tonight.",
      body: "You Left The Mess. You Clear It. Counters Too.",
      dueDays: 1,
    },
    {
      title: "Phone Away For The Next Quality Hour.",
      body: "Face Up. Notifications Off. You Stay In The Room.",
      dueDays: 2,
    },
  ],
  3: [
    {
      title: "Cook Dinner This Week. Their Menu.",
      body: "You Pissed Them Off. Find Out: You Shop, Cook, And Clean After.",
      dueDays: 7,
    },
    {
      title: "Plan A Make-Up Night. You Handle Logistics.",
      body: "Date, Time, Place. No “Whatever You Want.” You Decide And Follow Through.",
      dueDays: 7,
    },
  ],
  4: [
    {
      title: "Full Written Reckoning + One Concrete Fix.",
      body: "What You Did. Why It Landed. What Changes Starting Now. Then Do The Fix.",
      dueDays: 3,
    },
    {
      title: "Weekend Plan Of Their Choosing. You Fund And Drive.",
      body: "Slap-Level FA Gets A Real FO. They Pick. You Execute. No Negotiation On The Vibe.",
      dueDays: 14,
    },
  ],
  5: [
    {
      title: "Nuclear Reset: Grand Gesture They Name.",
      body: "You Went Nuclear. Find Out Is Whatever They Say It Is. Due When They Say.",
      dueDays: 7,
    },
    {
      title: "Overnight Accountability: You Own The Next 48 Hours.",
      body: "Schedule, Chores, Kids, Food, Follow-Through. They Rest. You Don't Make It About You.",
      dueDays: 2,
    },
  ],
};
