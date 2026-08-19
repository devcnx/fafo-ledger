import type { AppRole } from "./roles";

export type Severity = 1 | 2 | 3 | 4 | 5;

export type OffenseStatus = "open" | "forgiven" | "pattern" | "stale";

export type EvidenceType = "image" | "text" | "audio";

export type EvidenceItem = {
  id: string;
  type: EvidenceType;
  name: string;
  /** Text snippet or data URL for image/audio */
  data: string;
};

export type Offense = {
  id: string;
  date: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  impact: string;
  status: OffenseStatus;
  tags: string[];
  moods: string[];
  contexts: string[];
  evidence: EvidenceItem[];
  remorse: number | null;
  archived: boolean;
  authorRole: AppRole;
  againstRole: AppRole;
  authorEmail: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  statuteResetOn: string | null;
};

export type Profile = {
  trackerName: string;
  subjectName: string;
  anniversary: string;
  trackerBirthday: string;
  subjectBirthday: string;
  notes: string;
};

export type SeverityLabels = Partial<Record<Severity, string>>;

export type AppSettings = {
  severityLabels: SeverityLabels;
  purgeForgivenDays: number;
  statuteDays: number;
  coolingOffMinutes: number;
};

export type Apology = {
  id: string;
  offenseId: string | null;
  authorId: string;
  authorRole: AppRole;
  authorEmail: string;
  body: string;
  remorse: Severity;
  status: "pending" | "accepted" | "rejected";
  response: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Consequence = {
  id: string;
  title: string;
  description: string;
  triggerRule: string;
  status: "open" | "done" | "cancelled";
  createdByRole: AppRole;
  createdByEmail: string;
  assignedToRole: AppRole;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Credit = {
  id: string;
  date: string;
  title: string;
  description: string;
  authorRole: AppRole;
  authorEmail: string;
  aboutRole: AppRole;
  status: "pending" | "accepted" | "rejected";
  response: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Quote = {
  id: string;
  quoteText: string;
  saidByRole: AppRole;
  context: string;
  pinned: boolean;
  authorRole: AppRole;
  authorEmail: string;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  userEmail: string;
  title: string;
  body: string;
  kind: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export type FindOutStatus =
  | "issued"
  | "acknowledged"
  | "served"
  | "waived"
  | "appealed";

export type FindOut = {
  id: string;
  offenseId: string | null;
  title: string;
  body: string;
  issuedByRole: AppRole;
  issuedByEmail: string;
  assignedToRole: AppRole;
  status: FindOutStatus;
  dueDate: string | null;
  acknowledgedAt: string | null;
  servedAt: string | null;
  escalationNote: string;
  repeatCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OffenseTemplate = {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  description: string;
  impact: string;
  ownerRole: "tracker" | "subject" | "both";
  createdAt: string;
};

export type PerkKind = "favor" | "pass" | "date" | "jail_pass";

export type PerkStatus = "available" | "pending" | "redeemed" | "revoked" | "burned";

export type PerkSource = "manual" | "fo_served" | "peace_streak" | "calendar_act" | "bond";

export type Perk = {
  id: string;
  title: string;
  body: string;
  kind: PerkKind;
  status: PerkStatus;
  grantedByRole: AppRole;
  grantedByEmail: string;
  assignedToRole: AppRole;
  source: PerkSource;
  sourceId: string | null;
  expiresOn: string | null;
  redeemedAt: string | null;
  honorNote: string;
  createdAt: string;
  updatedAt: string;
};

export type BondStatus = "escrow" | "released" | "burned";

export type Bond = {
  id: string;
  title: string;
  body: string;
  kind: PerkKind;
  category: string;
  days: number;
  assignedToRole: AppRole;
  grantedByRole: AppRole;
  grantedByEmail: string;
  status: BondStatus;
  releasesOn: string;
  resolvedAt: string | null;
  perkId: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type Parole = {
  id: string;
  role: AppRole;
  category: string;
  findOutId: string | null;
  endsOn: string;
  createdAt: string;
};

export type BargainStatus = "pending" | "accepted" | "rejected";

export type BargainOffer = {
  id: string;
  findOutId: string;
  proposedByRole: AppRole;
  title: string;
  body: string;
  dueDate: string | null;
  status: BargainStatus;
  createdAt: string;
  updatedAt: string;
};

export type PeaceMilestone = 7 | 14 | 30;

export type PeaceStreakInfo = {
  role: AppRole;
  days: number;
  nextMilestone: PeaceMilestone | null;
  daysUntilNext: number;
  streakStart: string;
};
