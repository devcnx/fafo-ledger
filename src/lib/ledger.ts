import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { STARTER_TEMPLATES } from "@/lib/constants";
import {
  LEGACY_HOUSEHOLD,
  type AppRole,
  type HouseholdMode,
} from "@/lib/roles";
import type {
  Apology,
  AppNotification,
  AppSettings,
  Consequence,
  Credit,
  EvidenceItem,
  Offense,
  OffenseStatus,
  OffenseTemplate,
  Profile,
  Quote,
  Severity,
  SeverityLabels,
} from "@/lib/types";

export type DisputeKind = "dispute" | "appeal";
export type DisputeStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type Dispute = {
  id: string;
  offenseId: string;
  authorId: string;
  authorEmail: string;
  authorRole: AppRole;
  kind: DisputeKind;
  body: string;
  status: DisputeStatus;
  response: string | null;
  evidence: EvidenceItem[];
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LedgerSnapshot = {
  needsOnboarding: boolean;
  role: AppRole | null;
  email: string;
  displayName: string;
  householdId: string | null;
  householdName: string | null;
  householdMode: HouseholdMode | null;
  inviteCode: string | null;
  isOwner: boolean;
  profile: Profile;
  settings: AppSettings;
  offenses: Offense[];
  disputes: Dispute[];
  apologies: Apology[];
  consequences: Consequence[];
  credits: Credit[];
  quotes: Quote[];
  notifications: AppNotification[];
  templates: OffenseTemplate[];
  categories: string[];
};

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function asDateOnly(value: unknown, fallback: string): string {
  if (value == null || value === "") return fallback;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : fallback;
}

function parseJsonArray<T>(raw: unknown): T[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw as T[];
  try {
    const v = JSON.parse(String(raw));
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T extends object>(raw: unknown, fallback: T): T {
  if (raw == null || raw === "" || raw === "{}") return fallback;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as T;
  try {
    return { ...fallback, ...(JSON.parse(String(raw)) as T) };
  } catch {
    return fallback;
  }
}

type HouseholdWho = {
  userId: string;
  email: string;
  role: AppRole;
  displayName: string;
  householdId: string;
  householdName: string;
  householdMode: HouseholdMode;
  inviteCode: string | null;
  isOwner: boolean;
};

async function loadUser(userId: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ email: string; name: string }>`
    select email, name from "user" where id = ${userId} limit 1
  `;
  if (!rows[0]) throw new Error("Account Not Found.");
  return {
    email: String(rows[0].email).toLowerCase(),
    name: String(rows[0].name ?? ""),
  };
}

async function findMembership(userId: string, email: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const byUser = await sql<Record<string, unknown>>`
    select m.*, h.name as household_name, h.mode as household_mode, h.invite_code
    from household_members m
    join households h on h.id = m.household_id
    where m.user_id = ${userId}
    limit 1
  `;
  if (byUser[0]) return byUser[0];
  const byEmail = await sql<Record<string, unknown>>`
    select m.*, h.name as household_name, h.mode as household_mode, h.invite_code
    from household_members m
    join households h on h.id = m.household_id
    where lower(m.email) = ${email.toLowerCase()}
    limit 1
  `;
  if (byEmail[0]) {
    await sql`
      update household_members
      set user_id = ${userId}
      where id = ${String(byEmail[0].id)}
        and (user_id is null or user_id = '')
    `;
    return byEmail[0];
  }
  return null;
}

async function requireHousehold(userId: string): Promise<HouseholdWho> {
  const user = await loadUser(userId);
  const mem = await findMembership(userId, user.email);
  if (!mem) {
    throw new Error("No household yet. Finish onboarding to create or join a ledger.");
  }
  return {
    userId,
    email: user.email,
    role: String(mem.role) as AppRole,
    displayName: String(mem.display_name || user.name || user.email),
    householdId: String(mem.household_id),
    householdName: String(mem.household_name || "Household Ledger"),
    householdMode: String(mem.household_mode || "couple") as HouseholdMode,
    inviteCode: mem.invite_code == null ? null : String(mem.invite_code),
    isOwner: Number(mem.is_owner ?? 0) === 1,
  };
}

async function partnerEmailInHousehold(householdId: string, myRole: AppRole) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const other = myRole === "tracker" ? "subject" : "tracker";
  const rows = await sql<{ email: string }>`
    select email from household_members
    where household_id = ${householdId} and role = ${other}
    limit 1
  `;
  return rows[0]?.email?.toLowerCase() ?? "";
}


async function notify(
  sql: Awaited<ReturnType<typeof import("@/lib/db").getSql>>,
  userEmail: string,
  title: string,
  body: string,
  kind = "info",
  href?: string,
  householdId?: string,
) {
  await sql`
    insert into notifications (id, user_email, title, body, kind, href, read, created_at, household_id)
    values (
      ${uid()},
      ${userEmail.toLowerCase()},
      ${title},
      ${body},
      ${kind},
      ${href ?? null},
      0,
      ${new Date().toISOString()},
      ${householdId ?? LEGACY_HOUSEHOLD.id}
    )
  `;
}


function mapOffense(row: Record<string, unknown>): Offense {
  return {
    id: String(row.id),
    date: new Date(String(row.date)).toISOString(),
    severity: Number(row.severity) as Severity,
    category: String(row.category),
    title: String(row.title),
    description: String(row.description),
    impact: String(row.impact ?? ""),
    status: String(row.status) as OffenseStatus,
    tags: [],
    moods: parseJsonArray<string>(row.moods),
    contexts: parseJsonArray<string>(row.contexts),
    evidence: parseJsonArray<EvidenceItem>(row.evidence),
    remorse: row.remorse == null ? null : Number(row.remorse),
    archived: Number(row.archived ?? 0) === 1,
    authorRole: String(row.author_role ?? "tracker") as AppRole,
    againstRole: String(row.against_role ?? "subject") as AppRole,
    authorEmail: String(row.author_email ?? ""),
    createdBy: String(row.created_by ?? ""),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapDispute(row: Record<string, unknown>): Dispute {
  return {
    id: String(row.id),
    offenseId: String(row.offense_id),
    authorId: String(row.author_id),
    authorEmail: String(row.author_email),
    authorRole: String(row.author_role) as AppRole,
    kind: String(row.kind) as DisputeKind,
    body: String(row.body),
    status: String(row.status) as DisputeStatus,
    response: row.response == null ? null : String(row.response),
    evidence: parseJsonArray<EvidenceItem>(row.evidence),
    resolvedBy: row.resolved_by == null ? null : String(row.resolved_by),
    resolvedAt: row.resolved_at == null ? null : new Date(String(row.resolved_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapApology(row: Record<string, unknown>): Apology {
  return {
    id: String(row.id),
    offenseId: row.offense_id == null ? null : String(row.offense_id),
    authorId: String(row.author_id),
    authorRole: String(row.author_role) as AppRole,
    authorEmail: String(row.author_email),
    body: String(row.body),
    remorse: Number(row.remorse) as Severity,
    status: String(row.status) as Apology["status"],
    response: row.response == null ? null : String(row.response),
    resolvedBy: row.resolved_by == null ? null : String(row.resolved_by),
    resolvedAt: row.resolved_at == null ? null : new Date(String(row.resolved_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapConsequence(row: Record<string, unknown>): Consequence {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    triggerRule: String(row.trigger_rule ?? ""),
    status: String(row.status) as Consequence["status"],
    createdByRole: String(row.created_by_role) as AppRole,
    createdByEmail: String(row.created_by_email),
    assignedToRole: String(row.assigned_to_role) as AppRole,
    dueDate: row.due_date == null ? null : String(row.due_date),
    completedAt: row.completed_at == null ? null : new Date(String(row.completed_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapCredit(row: Record<string, unknown>): Credit {
  return {
    id: String(row.id),
    date: new Date(String(row.date)).toISOString(),
    title: String(row.title),
    description: String(row.description ?? ""),
    authorRole: String(row.author_role) as AppRole,
    authorEmail: String(row.author_email),
    aboutRole: String(row.about_role) as AppRole,
    status: String(row.status) as Credit["status"],
    response: row.response == null ? null : String(row.response),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapQuote(row: Record<string, unknown>): Quote {
  return {
    id: String(row.id),
    quoteText: String(row.quote_text),
    saidByRole: String(row.said_by_role) as AppRole,
    context: String(row.context ?? ""),
    pinned: Number(row.pinned ?? 0) === 1,
    authorRole: String(row.author_role) as AppRole,
    authorEmail: String(row.author_email),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapNotif(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id),
    userEmail: String(row.user_email),
    title: String(row.title),
    body: String(row.body ?? ""),
    kind: String(row.kind ?? "info"),
    href: row.href == null ? null : String(row.href),
    read: Number(row.read ?? 0) === 1,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapTemplate(row: Record<string, unknown>): OffenseTemplate {
  return {
    id: String(row.id),
    title: String(row.title),
    category: String(row.category),
    severity: Number(row.severity) as Severity,
    description: String(row.description ?? ""),
    impact: String(row.impact ?? ""),
    ownerRole: String(row.owner_role ?? "both") as OffenseTemplate["ownerRole"],
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

const evidenceSchema = z.array(
  z.object({
    id: z.string(),
    type: z.enum(["image", "text", "audio"]),
    name: z.string(),
    data: z.string().max(900_000),
  }),
);

export const getLedger = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LedgerSnapshot> => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const user = await loadUser(context.userId);
    const mem = await findMembership(context.userId, user.email);
    const emptyProfile: Profile = {
      trackerName: user.name || "You",
      subjectName: "Partner",
      anniversary: "2025-06-16",
      trackerBirthday: "2000-01-01",
      subjectBirthday: "2000-01-01",
      notes: "",
    };
    const emptySettings: AppSettings = { severityLabels: {}, purgeForgivenDays: 0 };
    if (!mem) {
      return {
        needsOnboarding: true,
        role: null,
        email: user.email,
        displayName: user.name || user.email,
        householdId: null,
        householdName: null,
        householdMode: null,
        inviteCode: null,
        isOwner: false,
        profile: emptyProfile,
        settings: emptySettings,
        offenses: [],
        disputes: [],
        apologies: [],
        consequences: [],
        credits: [],
        quotes: [],
        notifications: [],
        templates: [],
        categories: [],
      };
    }
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const hh = who.householdId;

    const profileRows = await sql<Record<string, unknown>>`
      select * from ledger_profile where id = ${hh} limit 1
    `;
    const p = profileRows[0];
    const profile: Profile = p
      ? {
          trackerName: String(p.tracker_name),
          subjectName: String(p.subject_name),
          anniversary: asDateOnly(p.anniversary, "2025-06-16"),
          trackerBirthday: asDateOnly(p.tracker_birthday, "1989-02-18"),
          subjectBirthday: asDateOnly(p.subject_birthday, "1986-12-01"),
          notes: String(p.notes ?? ""),
        }
      : emptyProfile;

    const settingsRows = await sql<Record<string, unknown>>`
      select * from ledger_settings where id = ${hh} limit 1
    `;
    const srow = settingsRows[0];
    const settings: AppSettings = {
      severityLabels: parseJsonObject<SeverityLabels>(srow?.severity_labels, {}),
      purgeForgivenDays: Number(srow?.purge_forgiven_days ?? 0),
    };

    const [
      offenseRows,
      disputeRows,
      apologyRows,
      consequenceRows,
      creditRows,
      quoteRows,
      notifRows,
      templateRows,
      catRows,
    ] = await Promise.all([
      sql<Record<string, unknown>>`select * from offenses where household_id = ${hh} order by date desc`,
      sql<Record<string, unknown>>`select * from disputes where household_id = ${hh} order by created_at desc`,
      sql<Record<string, unknown>>`select * from apologies where household_id = ${hh} order by created_at desc`,
      sql<Record<string, unknown>>`select * from consequences where household_id = ${hh} order by created_at desc`,
      sql<Record<string, unknown>>`select * from credits where household_id = ${hh} order by date desc`,
      sql<Record<string, unknown>>`select * from quotes where household_id = ${hh} order by pinned desc, created_at desc`,
      sql<Record<string, unknown>>`
        select * from notifications
        where household_id = ${hh} and lower(user_email) = ${who.email}
        order by created_at desc
        limit 50
      `,
      sql<Record<string, unknown>>`select * from offense_templates where household_id = ${hh} order by title`,
      sql<{ name: string }>`select name from custom_categories where household_id = ${hh} order by name`,
    ]);

    return {
      needsOnboarding: false,
      role: who.role,
      email: who.email,
      displayName: who.displayName,
      householdId: who.householdId,
      householdName: who.householdName,
      householdMode: who.householdMode,
      inviteCode: who.inviteCode,
      isOwner: who.isOwner,
      profile,
      settings,
      offenses: offenseRows.map(mapOffense),
      disputes: disputeRows.map(mapDispute),
      apologies: apologyRows.map(mapApology),
      consequences: consequenceRows.map(mapConsequence),
      credits: creditRows.map(mapCredit),
      quotes: quoteRows.map(mapQuote),
      notifications: notifRows.map(mapNotif),
      templates: templateRows.map(mapTemplate),
      categories: catRows.map((c) => c.name),
    };
  });

const offenseInput = z.object({
  date: z.string(),
  severity: z.number().int().min(1).max(5),
  category: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  impact: z.string().optional(),
  status: z.enum(["open", "forgiven", "pattern"]).optional(),
  moods: z.array(z.string()).optional(),
  contexts: z.array(z.string()).optional(),
  evidence: evidenceSchema.optional(),
  remorse: z.number().int().min(1).max(5).nullable().optional(),
  againstRole: z.enum(["tracker", "subject"]).optional(),
});

export const addOffense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => offenseInput.parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const againstRole = data.againstRole ?? (who.role === "tracker" ? "subject" : "tracker");
    if (againstRole === who.role) {
      throw new Error("You log what the other person did — pick the other partner.");
    }
    const sql = await getSql();
    const id = uid();
    const now = new Date().toISOString();
    await sql`
      insert into offenses (
        id, date, severity, category, title, description, impact, status,
        created_by, created_at, updated_at,
        author_role, against_role, author_email, moods, contexts, evidence, remorse, archived,
        household_id
      ) values (
        ${id},
        ${data.date},
        ${data.severity},
        ${data.category.trim()},
        ${data.title.trim()},
        ${data.description.trim()},
        ${(data.impact ?? "").trim()},
        ${data.status ?? "open"},
        ${who.userId},
        ${now},
        ${now},
        ${who.role},
        ${againstRole},
        ${who.email},
        ${JSON.stringify(data.moods ?? [])},
        ${JSON.stringify(data.contexts ?? [])},
        ${JSON.stringify(data.evidence ?? [])},
        ${data.remorse ?? null},
        0,
        ${who.householdId}
      )
    `;
    if (data.category.trim()) {
      await sql`
        insert into custom_categories (household_id, name)
        values (${who.householdId}, ${data.category.trim()})
        on conflict (household_id, name) do nothing
      `;
    }
    const targetEmail = await partnerEmailInHousehold(who.householdId, who.role);
    if (targetEmail) {
      await notify(
        sql,
        targetEmail,
        "New Offense Logged",
        `${who.displayName} logged: ${data.title.trim()}`,
        "offense",
        "history",
        who.householdId,
      );
    }
    return { id };
  });

const updateOffenseInput = z.object({
  id: z.string(),
  date: z.string().optional(),
  severity: z.number().int().min(1).max(5).optional(),
  category: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  impact: z.string().optional(),
  status: z.enum(["open", "forgiven", "pattern"]).optional(),
  moods: z.array(z.string()).optional(),
  contexts: z.array(z.string()).optional(),
  evidence: evidenceSchema.optional(),
  remorse: z.number().int().min(1).max(5).nullable().optional(),
  archived: z.boolean().optional(),
});

export const updateOffense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => updateOffenseInput.parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from offenses where id = ${data.id} and household_id = ${who.householdId} limit 1
    `;
    if (!rows[0]) throw new Error("Offense not found.");
    const cur = rows[0];
    const isAuthor =
      String(cur.created_by) === who.userId ||
      String(cur.author_email).toLowerCase() === who.email;
    if (!isAuthor && who.role !== "tracker") throw new Error("You can only edit your own entries.");

    const next = {
      date: data.date ?? String(cur.date),
      severity: data.severity ?? Number(cur.severity),
      category: (data.category ?? String(cur.category)).trim(),
      title: (data.title ?? String(cur.title)).trim(),
      description: (data.description ?? String(cur.description)).trim(),
      impact: (data.impact ?? String(cur.impact ?? "")).trim(),
      status: data.status ?? String(cur.status),
      moods: JSON.stringify(data.moods ?? parseJsonArray(cur.moods)),
      contexts: JSON.stringify(data.contexts ?? parseJsonArray(cur.contexts)),
      evidence: JSON.stringify(data.evidence ?? parseJsonArray(cur.evidence)),
      remorse:
        data.remorse !== undefined
          ? data.remorse
          : cur.remorse == null
            ? null
            : Number(cur.remorse),
      archived: data.archived !== undefined ? (data.archived ? 1 : 0) : Number(cur.archived ?? 0),
    };
    const now = new Date().toISOString();
    await sql`
      update offenses set
        date = ${next.date},
        severity = ${next.severity},
        category = ${next.category},
        title = ${next.title},
        description = ${next.description},
        impact = ${next.impact},
        status = ${next.status},
        moods = ${next.moods},
        contexts = ${next.contexts},
        evidence = ${next.evidence},
        remorse = ${next.remorse},
        archived = ${next.archived},
        updated_at = ${now}
      where id = ${data.id}
    `;
    return { ok: true };
  });

export const deleteOffense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from offenses where id = ${data.id} and household_id = ${who.householdId} limit 1
    `;
    if (!rows[0]) throw new Error("Offense not found.");
    const cur = rows[0];
    const isAuthor =
      String(cur.created_by) === who.userId ||
      String(cur.author_email).toLowerCase() === who.email;
    if (!isAuthor && who.role !== "tracker") {
      throw new Error("You can only delete your own entries.");
    }
    await sql`delete from offenses where id = ${data.id} and household_id = ${who.householdId}`;
    return { ok: true };
  });

export const clearOffenses = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    if (who.role !== "tracker") throw new Error("Only Brittaney can clear the full ledger.");
    const sql = await getSql();
    await sql`delete from disputes`;
    await sql`delete from apologies`;
    await sql`delete from offenses where household_id = ${who.householdId}`;
    return { ok: true };
  });

const profileInput = z.object({
  trackerName: z.string().min(1),
  subjectName: z.string().min(1),
  anniversary: z.string().min(1),
  trackerBirthday: z.string().min(1),
  subjectBirthday: z.string().min(1),
  notes: z.string().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => profileInput.parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    if (!who.isOwner && who.role !== "tracker") throw new Error("Only the household owner can edit the profile.");
    const sql = await getSql();
    const now = new Date().toISOString();
    await sql`
      insert into ledger_profile (
        id, tracker_name, subject_name, anniversary, tracker_birthday, subject_birthday, notes, updated_at
      ) values (
        ${who.householdId},
        ${data.trackerName.trim()},
        ${data.subjectName.trim()},
        ${asDateOnly(data.anniversary, "2025-06-16")},
        ${asDateOnly(data.trackerBirthday, "1989-02-18")},
        ${asDateOnly(data.subjectBirthday, "1986-12-01")},
        ${(data.notes ?? "").trim()},
        ${now}
      )
      on conflict (id) do update set
        tracker_name = excluded.tracker_name,
        subject_name = excluded.subject_name,
        anniversary = excluded.anniversary,
        tracker_birthday = excluded.tracker_birthday,
        subject_birthday = excluded.subject_birthday,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `;
    return { ok: true };
  });

const settingsInput = z.object({
  severityLabels: z.record(z.string(), z.string()).optional(),
  purgeForgivenDays: z.number().int().min(0).max(3650).optional(),
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => settingsInput.parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    if (!who.isOwner && who.role !== "tracker") throw new Error("Only the household owner can change severity labels.");
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from ledger_settings where id = ${who.householdId} limit 1
    `;
    const cur = rows[0] ?? {};
    const labels = data.severityLabels
      ? JSON.stringify(data.severityLabels)
      : String(cur.severity_labels ?? "{}");
    const purge =
      data.purgeForgivenDays !== undefined
        ? data.purgeForgivenDays
        : Number(cur.purge_forgiven_days ?? 0);
    const now = new Date().toISOString();
    await sql`
      insert into ledger_settings (id, severity_labels, purge_forgiven_days, updated_at)
      values (${who.householdId}, ${labels}, ${purge}, ${now})
      on conflict (id) do update set
        severity_labels = excluded.severity_labels,
        purge_forgiven_days = excluded.purge_forgiven_days,
        updated_at = excluded.updated_at
    `;
    return { ok: true };
  });

export const purgeForgiven = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    if (!who.isOwner && who.role !== "tracker") throw new Error("Only the household owner can purge.");
    const sql = await getSql();
    const s = await sql<{ purge_forgiven_days: number }>`
      select purge_forgiven_days from ledger_settings where id = ${who.householdId} limit 1
    `;
    const days = Number(s[0]?.purge_forgiven_days ?? 0);
    if (days <= 0) throw new Error("Set purge days in settings first (greater than 0).");
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    await sql`
      delete from offenses
      where household_id = ${who.householdId}
        and status = 'forgiven' and updated_at < ${cutoff}
    `;
    return { ok: true, purgedBefore: cutoff };
  });

const disputeInput = z.object({
  offenseId: z.string(),
  kind: z.enum(["dispute", "appeal"]),
  body: z.string().min(1).max(4000),
  evidence: evidenceSchema.optional(),
});

export const submitDispute = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => disputeInput.parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const offense = await sql<Record<string, unknown>>`
      select * from offenses where id = ${data.offenseId} and household_id = ${who.householdId} limit 1
    `;
    if (!offense[0]) throw new Error("Offense not found.");
    const authorEmail = String(offense[0].author_email ?? "").toLowerCase();
    const authorRole = String(offense[0].author_role ?? "tracker") as AppRole;
    if (authorEmail === who.email || authorRole === who.role) {
      throw new Error("You can't dispute your own entry. Edit it instead.");
    }
    const id = uid();
    const now = new Date().toISOString();
    await sql`
      insert into disputes (
        id, offense_id, author_id, author_email, author_role, kind, body, status, evidence, created_at, updated_at, household_id
      ) values (
        ${id},
        ${data.offenseId},
        ${who.userId},
        ${who.email},
        ${who.role},
        ${data.kind},
        ${data.body.trim()},
        'pending',
        ${JSON.stringify(data.evidence ?? [])},
        ${now},
        ${now},
        ${who.householdId}
      )
    `;
    await notify(
      sql,
      authorEmail || await partnerEmailInHousehold(who.householdId, who.role),
      "New Dispute Filed",
      `${who.displayName} disputed: ${String(offense[0].title)}`,
      "dispute",
      "history",
    );
    return { id };
  });

const resolveDisputeInput = z.object({
  id: z.string(),
  status: z.enum(["accepted", "rejected"]),
  response: z.string().max(4000).optional(),
  forgiveOffense: z.boolean().optional(),
});

export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => resolveDisputeInput.parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select d.*, o.author_email as offense_author_email, o.author_role as offense_author_role, o.title as offense_title
      from disputes d
      join offenses o on o.id = d.offense_id
      where d.id = ${data.id}
      limit 1
    `;
    if (!rows[0]) throw new Error("Dispute not found.");
    if (String(rows[0].status) !== "pending") throw new Error("This dispute is already closed.");
    const offenseAuthorEmail = String(rows[0].offense_author_email ?? "").toLowerCase();
    const offenseAuthorRole = String(rows[0].offense_author_role ?? "tracker") as AppRole;
    const canResolve =
      offenseAuthorEmail === who.email ||
      offenseAuthorRole === who.role ||
      who.role === "tracker";
    if (!canResolve) throw new Error("Only the person who logged it can rule on the dispute.");

    const now = new Date().toISOString();
    await sql`
      update disputes set
        status = ${data.status},
        response = ${(data.response ?? "").trim() || null},
        resolved_by = ${who.userId},
        resolved_at = ${now},
        updated_at = ${now}
      where id = ${data.id}
    `;
    if (data.forgiveOffense && data.status === "accepted") {
      await sql`
        update offenses set status = 'forgiven', updated_at = ${now}
        where id = ${String(rows[0].offense_id)}
      `;
    }
    await notify(
      sql,
      String(rows[0].author_email),
      data.status === "accepted" ? "Dispute accepted" : "Dispute rejected",
      `Ruling on “${String(rows[0].offense_title)}”: ${data.status}.`,
      "dispute",
      "history",
      who.householdId,
    );
    return { ok: true };
  });

export const withdrawDispute = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from disputes where id = ${data.id} limit 1
    `;
    if (!rows[0]) throw new Error("Dispute not found.");
    if (
      String(rows[0].author_id) !== who.userId &&
      String(rows[0].author_email).toLowerCase() !== who.email
    ) {
      throw new Error("Not your dispute.");
    }
    if (String(rows[0].status) !== "pending") throw new Error("Only pending disputes can be withdrawn.");
    const now = new Date().toISOString();
    await sql`
      update disputes set status = 'withdrawn', updated_at = ${now}
      where id = ${data.id}
    `;
    return { ok: true };
  });

const apologyInput = z.object({
  offenseId: z.string().nullable().optional(),
  body: z.string().min(1).max(4000),
  remorse: z.number().int().min(1).max(5),
});

export const submitApology = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => apologyInput.parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const id = uid();
    const now = new Date().toISOString();
    await sql`
      insert into apologies (
        id, offense_id, author_id, author_role, author_email, body, remorse, status, created_at, updated_at, household_id
      ) values (
        ${id},
        ${data.offenseId ?? null},
        ${who.userId},
        ${who.role},
        ${who.email},
        ${data.body.trim()},
        ${data.remorse},
        'pending',
        ${now},
        ${now},
        ${who.householdId}
      )
    `;
    if (data.offenseId && data.remorse) {
      await sql`
        update offenses set remorse = ${data.remorse}, updated_at = ${now}
        where id = ${data.offenseId}
      `;
    }
    await notify(
      sql,
      await partnerEmailInHousehold(who.householdId, who.role),
      "Apology Submitted",
      `${who.displayName} apologized (remorse ${data.remorse}/5).`,
      "apology",
      "apologies",
    );
    return { id };
  });

export const resolveApology = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string(),
        status: z.enum(["accepted", "rejected"]),
        response: z.string().max(2000).optional(),
        forgiveOffense: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from apologies where id = ${data.id} limit 1
    `;
    if (!rows[0]) throw new Error("Apology not found.");
    if (String(rows[0].author_role) === who.role) {
      throw new Error("You can't accept your own apology.");
    }
    if (String(rows[0].status) !== "pending") throw new Error("Already resolved.");
    const now = new Date().toISOString();
    await sql`
      update apologies set
        status = ${data.status},
        response = ${(data.response ?? "").trim() || null},
        resolved_by = ${who.userId},
        resolved_at = ${now},
        updated_at = ${now}
      where id = ${data.id}
    `;
    if (data.forgiveOffense && data.status === "accepted" && rows[0].offense_id) {
      await sql`
        update offenses set status = 'forgiven', updated_at = ${now}
        where id = ${String(rows[0].offense_id)}
      `;
    }
    await notify(
      sql,
      String(rows[0].author_email),
      data.status === "accepted" ? "Apology accepted" : "Apology rejected",
      data.response?.trim() || `Your apology was ${data.status}.`,
      "apology",
      "apologies",
      who.householdId,
    );
    return { ok: true };
  });

export const addConsequence = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        triggerRule: z.string().optional(),
        assignedToRole: z.enum(["tracker", "subject"]),
        dueDate: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const id = uid();
    const now = new Date().toISOString();
    await sql`
      insert into consequences (
        id, title, description, trigger_rule, status, created_by_role, created_by_email,
        assigned_to_role, due_date, created_at, updated_at, household_id
      ) values (
        ${id},
        ${data.title.trim()},
        ${(data.description ?? "").trim()},
        ${(data.triggerRule ?? "").trim()},
        'open',
        ${who.role},
        ${who.email},
        ${data.assignedToRole},
        ${data.dueDate ?? null},
        ${now},
        ${now},
        ${who.householdId}
      )
    `;
    await notify(
      sql,
      await partnerEmailInHousehold(who.householdId, who.role),
      "New Consequence On The Board",
      data.title.trim(),
      "consequence",
      "consequences",
    );
    return { id };
  });

export const updateConsequence = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string(),
        status: z.enum(["open", "done", "cancelled"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        triggerRule: z.string().optional(),
        dueDate: z.string().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    await requireHousehold(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from consequences where id = ${data.id} limit 1
    `;
    if (!rows[0]) throw new Error("Not found.");
    const now = new Date().toISOString();
    const status = data.status ?? String(rows[0].status);
    const completedAt = status === "done" ? now : null;
    await sql`
      update consequences set
        status = ${status},
        title = ${(data.title ?? String(rows[0].title)).trim()},
        description = ${(data.description ?? String(rows[0].description ?? "")).trim()},
        trigger_rule = ${(data.triggerRule ?? String(rows[0].trigger_rule ?? "")).trim()},
        due_date = ${data.dueDate !== undefined ? data.dueDate : rows[0].due_date},
        completed_at = ${completedAt},
        updated_at = ${now}
      where id = ${data.id}
    `;
    return { ok: true };
  });

export const deleteConsequence = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    await requireHousehold(context.userId);
    const sql = await getSql();
    await sql`delete from consequences where id = ${data.id}`;
    return { ok: true };
  });

export const addCredit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) =>
    z
      .object({
        date: z.string(),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        aboutRole: z.enum(["tracker", "subject"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const id = uid();
    const now = new Date().toISOString();
    await sql`
      insert into credits (
        id, date, title, description, author_role, author_email, about_role, status, created_at, updated_at, household_id
      ) values (
        ${id},
        ${data.date},
        ${data.title.trim()},
        ${(data.description ?? "").trim()},
        ${who.role},
        ${who.email},
        ${data.aboutRole},
        'pending',
        ${now},
        ${now},
        ${who.householdId}
      )
    `;
    await notify(
      sql,
      await partnerEmailInHousehold(who.householdId, who.role),
      "Good deed logged",
      data.title.trim(),
      "credit",
      "credits",
    );
    return { id };
  });

export const resolveCredit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string(),
        status: z.enum(["accepted", "rejected"]),
        response: z.string().max(1000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select * from credits where id = ${data.id} limit 1
    `;
    if (!rows[0]) throw new Error("Not found.");
    if (String(rows[0].about_role) !== who.role) {
      throw new Error("Only the credited partner can accept/reject.");
    }
    const now = new Date().toISOString();
    await sql`
      update credits set
        status = ${data.status},
        response = ${(data.response ?? "").trim() || null},
        updated_at = ${now}
      where id = ${data.id}
    `;
    return { ok: true };
  });

export const addQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) =>
    z
      .object({
        quoteText: z.string().min(1).max(1000),
        saidByRole: z.enum(["tracker", "subject"]),
        context: z.string().optional(),
        pinned: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const id = uid();
    await sql`
      insert into quotes (id, quote_text, said_by_role, context, pinned, author_role, author_email, created_at, household_id)
      values (
        ${id},
        ${data.quoteText.trim()},
        ${data.saidByRole},
        ${(data.context ?? "").trim()},
        ${data.pinned ? 1 : 0},
        ${who.role},
        ${who.email},
        ${new Date().toISOString()}
      )
    `;
    return { id };
  });

export const updateQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) =>
    z.object({ id: z.string(), pinned: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    await requireHousehold(context.userId);
    const sql = await getSql();
    if (data.pinned !== undefined) {
      await sql`update quotes set pinned = ${data.pinned ? 1 : 0} where id = ${data.id}`;
    }
    return { ok: true };
  });

export const deleteQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    await requireHousehold(context.userId);
    const sql = await getSql();
    await sql`delete from quotes where id = ${data.id}`;
    return { ok: true };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) =>
    z.object({ ids: z.array(z.string()).optional(), all: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    if (data.all) {
      await sql`
        update notifications set read = 1 where lower(user_email) = ${who.email}
      `;
    } else if (data.ids?.length) {
      for (const id of data.ids) {
        await sql`
          update notifications set read = 1
          where id = ${id} and lower(user_email) = ${who.email}
        `;
      }
    }
    return { ok: true };
  });

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().optional(),
        title: z.string().min(1),
        category: z.string().min(1),
        severity: z.number().int().min(1).max(5),
        description: z.string().optional(),
        impact: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    const sql = await getSql();
    const id = data.id ?? uid();
    const now = new Date().toISOString();
    await sql`
      insert into offense_templates (id, household_id, title, category, severity, description, impact, owner_role, created_at)
      values (
        ${id},
        ${who.householdId},
        ${data.title.trim()},
        ${data.category.trim()},
        ${data.severity},
        ${(data.description ?? "").trim()},
        ${(data.impact ?? "").trim()},
        ${who.role},
        ${now},
        ${who.householdId}
      )
      on conflict (id) do update set
        title = excluded.title,
        category = excluded.category,
        severity = excluded.severity,
        description = excluded.description,
        impact = excluded.impact
    `;
    return { id };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    await requireHousehold(context.userId);
    const sql = await getSql();
    await sql`delete from offense_templates where id = ${data.id}`;
    return { ok: true };
  });

export const bootstrapLedger = createServerFn({ method: "POST" }).handler(async () => {
  const { ensureSeedUsers } = await import("@/lib/seed.server");
  await ensureSeedUsers();
  return { ok: true };
});


function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

const createHouseholdInput = z.object({
  mode: z.enum(["solo", "couple"]),
  yourName: z.string().min(1).max(120),
  partnerName: z.string().min(1).max(120),
  anniversary: z.string().optional(),
  yourBirthday: z.string().optional(),
  partnerBirthday: z.string().optional(),
  yourRole: z.enum(["tracker", "subject"]).optional(),
});

export const createHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => createHouseholdInput.parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const user = await loadUser(context.userId);
    if (await findMembership(context.userId, user.email)) {
      throw new Error("You Already Belong To A Household Ledger.");
    }
    const sql = await getSql();
    const hh = `hh-${uid()}`;
    const code = inviteCode();
    const trackerName = data.yourRole === "subject" ? data.partnerName.trim() : data.yourName.trim();
    const subjectName = data.yourRole === "subject" ? data.yourName.trim() : data.partnerName.trim();
    const myRole: AppRole = data.yourRole ?? "tracker";
    const partnerRole: AppRole = myRole === "tracker" ? "subject" : "tracker";
    const anniversary = asDateOnly(data.anniversary || "2025-06-16", "2025-06-16");
    const yourBirthday = asDateOnly(data.yourBirthday || "2000-01-01", "2000-01-01");
    const partnerBirthday = asDateOnly(data.partnerBirthday || "2000-01-01", "2000-01-01");
    const trackerBirthday = myRole === "tracker" ? yourBirthday : partnerBirthday;
    const subjectBirthday = myRole === "tracker" ? partnerBirthday : yourBirthday;

    await sql`
      insert into households (id, name, mode, invite_code, created_by_user_id)
      values (
        ${hh},
        ${`${data.yourName.trim()} Ledger`},
        ${data.mode},
        ${code},
        ${context.userId}
      )
    `;
    await sql`
      insert into household_members (
        id, household_id, user_id, email, display_name, role, is_owner
      ) values (
        ${`hm-${uid()}`},
        ${hh},
        ${context.userId},
        ${user.email},
        ${data.yourName.trim()},
        ${myRole},
        1
      )
    `;
    // Placeholder partner seat so invite can claim it
    await sql`
      insert into household_members (
        id, household_id, user_id, email, display_name, role, is_owner
      ) values (
        ${`hm-${uid()}`},
        ${hh},
        null,
        ${`pending+${code.toLowerCase()}@fafo.local`},
        ${data.partnerName.trim()},
        ${partnerRole},
        0
      )
    `;
    await sql`
      insert into ledger_profile (
        id, tracker_name, subject_name, anniversary, tracker_birthday, subject_birthday, notes
      ) values (
        ${hh},
        ${trackerName},
        ${subjectName},
        ${anniversary},
        ${trackerBirthday},
        ${subjectBirthday},
        ${""}
      )
    `;
    await sql`
      insert into ledger_settings (id, severity_labels, purge_forgiven_days)
      values (${hh}, '{}', 0)
    `;
    for (const tpl of STARTER_TEMPLATES) {
      await sql`
        insert into offense_templates (
          id, household_id, title, category, severity, description, impact, owner_role, created_at
        ) values (
          ${`${tpl.id}-${hh}`},
          ${hh},
          ${tpl.title},
          ${tpl.category},
          ${tpl.severity},
          ${tpl.description},
          ${tpl.impact},
          ${"both"},
          ${new Date().toISOString()}
        )
        on conflict (id) do nothing
      `;
    }
    return { householdId: hh, inviteCode: code, mode: data.mode };
  });

const joinHouseholdInput = z.object({
  inviteCode: z.string().min(4).max(32),
  displayName: z.string().min(1).max(120).optional(),
});

export const joinHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => joinHouseholdInput.parse(data))
  .handler(async ({ context, data }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const user = await loadUser(context.userId);
    if (await findMembership(context.userId, user.email)) {
      throw new Error("You Already Belong To A Household Ledger.");
    }
    const sql = await getSql();
    const code = data.inviteCode.trim().toUpperCase();
    const hhRows = await sql<Record<string, unknown>>`
      select * from households where upper(invite_code) = ${code} limit 1
    `;
    if (!hhRows[0]) throw new Error("Invalid Invite Code.");
    const hh = String(hhRows[0].id);
    const seats = await sql<Record<string, unknown>>`
      select * from household_members
      where household_id = ${hh} and (user_id is null or user_id = '')
      order by is_owner asc
      limit 1
    `;
    const display = (data.displayName || user.name || user.email).trim();
    if (seats[0]) {
      await sql`
        update household_members
        set user_id = ${context.userId},
            email = ${user.email},
            display_name = ${display}
        where id = ${String(seats[0].id)}
      `;
    } else {
      await sql`
        insert into household_members (
          id, household_id, user_id, email, display_name, role, is_owner
        ) values (
          ${`hm-${uid()}`},
          ${hh},
          ${context.userId},
          ${user.email},
          ${display},
          ${"subject"},
          0
        )
      `;
    }
    // Couple mode if second real member joined
    await sql`
      update households set mode = 'couple' where id = ${hh} and mode = 'solo'
    `;
    return { householdId: hh, ok: true };
  });

export const regenerateInviteCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { ensureSeedUsers } = await import("@/lib/seed.server");
    const { getSql } = await import("@/lib/db");
    await ensureSeedUsers();
    const who = await requireHousehold(context.userId);
    if (!who.isOwner) throw new Error("Only The Household Owner Can Refresh The Invite Code.");
    const sql = await getSql();
    const code = inviteCode();
    await sql`
      update households set invite_code = ${code} where id = ${who.householdId}
    `;
    // keep pending seat email in sync if present
    await sql`
      update household_members
      set email = ${`pending+${code.toLowerCase()}@fafo.local`}
      where household_id = ${who.householdId}
        and (user_id is null or user_id = '')
        and email like 'pending+%@fafo.local'
    `;
    return { inviteCode: code };
  });
