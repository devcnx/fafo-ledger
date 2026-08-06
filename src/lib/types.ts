import type { AppRole } from "./roles";

export type Severity = 1 | 2 | 3 | 4 | 5;

export type OffenseStatus = "open" | "forgiven" | "pattern";

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
