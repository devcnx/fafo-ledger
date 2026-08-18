import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addConsequence as addConsequenceFn,
  addCredit as addCreditFn,
  addOffense as addOffenseFn,
  addQuote as addQuoteFn,
  clearOffenses as clearOffensesFn,
  deleteConsequence as deleteConsequenceFn,
  deleteOffense as deleteOffenseFn,
  deleteQuote as deleteQuoteFn,
  deleteTemplate as deleteTemplateFn,
  getLedger,
  issueFindOut as issueFindOutFn,
  resolveFindOut as resolveFindOutFn,
  markNotificationsRead as markNotificationsReadFn,
  purgeForgiven as purgeForgivenFn,
  resolveApology as resolveApologyFn,
  resolveCredit as resolveCreditFn,
  resolveDispute as resolveDisputeFn,
  saveTemplate as saveTemplateFn,
  submitApology as submitApologyFn,
  submitDispute as submitDisputeFn,
  updateConsequence as updateConsequenceFn,
  updateOffense as updateOffenseFn,
  updateProfile as updateProfileFn,
  updateQuote as updateQuoteFn,
  updateSettings as updateSettingsFn,
  withdrawDispute as withdrawDisputeFn,
  type Dispute,
  type LedgerSnapshot,
} from "@/lib/ledger";
import type { AppRole } from "@/lib/roles";
import type {
  Apology,
  AppNotification,
  AppSettings,
  Consequence,
  Credit,
  EvidenceItem,
  FindOut,
  FindOutStatus,
  Offense,
  OffenseStatus,
  OffenseTemplate,
  Profile,
  Quote,
  Severity,
  SeverityLabels,
} from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

type LedgerContextValue = {
  loading: boolean;
  error: string | null;
  needsOnboarding: boolean;
  role: AppRole | null;
  email: string | null;
  displayName: string | null;
  householdId: string | null;
  householdName: string | null;
  householdMode: "solo" | "couple" | null;
  inviteCode: string | null;
  isOwner: boolean;
  profile: Profile;
  settings: AppSettings;
  offenses: Offense[];
  disputes: Dispute[];
  apologies: Apology[];
  consequences: Consequence[];
  findOuts: FindOut[];
  credits: Credit[];
  quotes: Quote[];
  notifications: AppNotification[];
  templates: OffenseTemplate[];
  categories: string[];
  refresh: () => Promise<void>;
  addOffense: (input: {
    date: string;
    severity: Severity;
    category: string;
    title: string;
    description: string;
    impact?: string;
    moods?: string[];
    contexts?: string[];
    evidence?: EvidenceItem[];
    remorse?: number | null;
    againstRole?: AppRole;
    findOut?: { title: string; body?: string; dueDate?: string | null };
  }) => Promise<void>;
  updateOffense: (
    id: string,
    patch: Partial<Offense> & {
      moods?: string[];
      contexts?: string[];
      evidence?: EvidenceItem[];
      remorse?: number | null;
      archived?: boolean;
    },
  ) => Promise<void>;
  deleteOffense: (id: string) => Promise<void>;
  clearOffenses: () => Promise<void>;
  updateProfile: (profile: Profile) => Promise<void>;
  updateSettings: (input: {
    severityLabels?: SeverityLabels;
    purgeForgivenDays?: number;
  }) => Promise<void>;
  purgeForgiven: () => Promise<void>;
  submitDispute: (input: {
    offenseId: string;
    kind: "dispute" | "appeal";
    body: string;
    evidence?: EvidenceItem[];
  }) => Promise<void>;
  resolveDispute: (input: {
    id: string;
    status: "accepted" | "rejected";
    response?: string;
    forgiveOffense?: boolean;
  }) => Promise<void>;
  withdrawDispute: (id: string) => Promise<void>;
  setStatus: (id: string, status: OffenseStatus) => Promise<void>;
  submitApology: (input: {
    offenseId?: string | null;
    body: string;
    remorse: Severity;
  }) => Promise<void>;
  resolveApology: (input: {
    id: string;
    status: "accepted" | "rejected";
    response?: string;
    forgiveOffense?: boolean;
  }) => Promise<void>;
  addConsequence: (input: {
    title: string;
    description?: string;
    triggerRule?: string;
    assignedToRole: AppRole;
    dueDate?: string | null;
  }) => Promise<void>;
  updateConsequence: (
    id: string,
    patch: Partial<{
      status: Consequence["status"];
      title: string;
      description: string;
      triggerRule: string;
      dueDate: string | null;
    }>,
  ) => Promise<void>;
  deleteConsequence: (id: string) => Promise<void>;
  issueFindOut: (input: {
    offenseId?: string | null;
    title: string;
    body?: string;
    assignedToRole?: AppRole;
    dueDate?: string | null;
  }) => Promise<void>;
  resolveFindOut: (input: {
    id: string;
    action: "acknowledge" | "serve" | "waive" | "appeal" | "escalate";
    note?: string;
  }) => Promise<void>;
  addCredit: (input: {
    date: string;
    title: string;
    description?: string;
    aboutRole: AppRole;
  }) => Promise<void>;
  resolveCredit: (input: {
    id: string;
    status: "accepted" | "rejected";
    response?: string;
  }) => Promise<void>;
  addQuote: (input: {
    quoteText: string;
    saidByRole: AppRole;
    context?: string;
    pinned?: boolean;
  }) => Promise<void>;
  updateQuote: (id: string, patch: { pinned?: boolean }) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  markNotificationsRead: (input?: { ids?: string[]; all?: boolean }) => Promise<void>;
  saveTemplate: (input: {
    id?: string;
    title: string;
    category: string;
    severity: Severity;
    description?: string;
    impact?: string;
  }) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
};

const LedgerContext = createContext<LedgerContextValue | null>(null);

const emptyProfile: Profile = {
  trackerName: "Brittaney Perry-Morgan",
  subjectName: "Michael Lucido",
  anniversary: "2025-06-16",
  trackerBirthday: "1989-02-18",
  subjectBirthday: "1986-12-01",
  notes: "",
};

const emptySettings: AppSettings = {
  severityLabels: {},
  purgeForgivenDays: 0,
};

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snap, setSnap] = useState<LedgerSnapshot | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await getLedger();
      setSnap(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load ledger";
      setError(msg);
      if (msg === "Unauthorized") throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 45000);
    return () => clearInterval(t);
  }, [refresh]);

  const value = useMemo<LedgerContextValue>(() => {
    const categories = Array.from(
      new Set([
        ...DEFAULT_CATEGORIES,
        ...(snap?.categories ?? []),
        ...(snap?.offenses.map((o) => o.category) ?? []),
      ]),
    ).sort((a, b) => a.localeCompare(b));

    return {
      loading,
      error,
      needsOnboarding: snap?.needsOnboarding ?? false,
      role: snap?.role ?? null,
      email: snap?.email ?? null,
      displayName: snap?.displayName ?? null,
      householdId: snap?.householdId ?? null,
      householdName: snap?.householdName ?? null,
      householdMode: snap?.householdMode ?? null,
      inviteCode: snap?.inviteCode ?? null,
      isOwner: snap?.isOwner ?? false,
      profile: snap?.profile ?? emptyProfile,
      settings: snap?.settings ?? emptySettings,
      offenses: snap?.offenses ?? [],
      disputes: snap?.disputes ?? [],
      apologies: snap?.apologies ?? [],
      consequences: snap?.consequences ?? [],
      findOuts: snap?.findOuts ?? [],
      credits: snap?.credits ?? [],
      quotes: snap?.quotes ?? [],
      notifications: snap?.notifications ?? [],
      templates: snap?.templates ?? [],
      categories,
      refresh,
      addOffense: async (input) => {
        await addOffenseFn({ data: input });
        await refresh();
      },
      updateOffense: async (id, patch) => {
        await updateOffenseFn({
          data: {
            id,
            date: patch.date,
            severity: patch.severity,
            category: patch.category,
            title: patch.title,
            description: patch.description,
            impact: patch.impact,
            status: patch.status,
            moods: patch.moods,
            contexts: patch.contexts,
            evidence: patch.evidence,
            remorse: patch.remorse,
            archived: patch.archived,
          },
        });
        await refresh();
      },
      deleteOffense: async (id) => {
        await deleteOffenseFn({ data: { id } });
        await refresh();
      },
      clearOffenses: async () => {
        await clearOffensesFn();
        await refresh();
      },
      updateProfile: async (profile) => {
        await updateProfileFn({ data: profile });
        await refresh();
      },
      updateSettings: async (input) => {
        await updateSettingsFn({ data: input });
        await refresh();
      },
      purgeForgiven: async () => {
        await purgeForgivenFn();
        await refresh();
      },
      submitDispute: async (input) => {
        await submitDisputeFn({ data: input });
        await refresh();
      },
      resolveDispute: async (input) => {
        await resolveDisputeFn({ data: input });
        await refresh();
      },
      withdrawDispute: async (id) => {
        await withdrawDisputeFn({ data: { id } });
        await refresh();
      },
      setStatus: async (id, status) => {
        await updateOffenseFn({ data: { id, status } });
        await refresh();
      },
      submitApology: async (input) => {
        await submitApologyFn({ data: input });
        await refresh();
      },
      resolveApology: async (input) => {
        await resolveApologyFn({ data: input });
        await refresh();
      },
      addConsequence: async (input) => {
        await addConsequenceFn({ data: input });
        await refresh();
      },
      updateConsequence: async (id, patch) => {
        await updateConsequenceFn({ data: { id, ...patch } });
        await refresh();
      },
      deleteConsequence: async (id) => {
        await deleteConsequenceFn({ data: { id } });
        await refresh();
      },
      issueFindOut: async (input) => {
        await issueFindOutFn({ data: input });
        await refresh();
      },
      resolveFindOut: async (input) => {
        await resolveFindOutFn({ data: input });
        await refresh();
      },
      addCredit: async (input) => {
        await addCreditFn({ data: input });
        await refresh();
      },
      resolveCredit: async (input) => {
        await resolveCreditFn({ data: input });
        await refresh();
      },
      addQuote: async (input) => {
        await addQuoteFn({ data: input });
        await refresh();
      },
      updateQuote: async (id, patch) => {
        await updateQuoteFn({ data: { id, ...patch } });
        await refresh();
      },
      deleteQuote: async (id) => {
        await deleteQuoteFn({ data: { id } });
        await refresh();
      },
      markNotificationsRead: async (input) => {
        await markNotificationsReadFn({ data: input ?? { all: true } });
        await refresh();
      },
      saveTemplate: async (input) => {
        await saveTemplateFn({ data: input });
        await refresh();
      },
      deleteTemplate: async (id) => {
        await deleteTemplateFn({ data: { id } });
        await refresh();
      },
    };
  }, [loading, error, snap, refresh]);

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error("useLedger must be used within LedgerProvider");
  return ctx;
}
