import type { Sql } from "@/lib/db";
import {
  CALENDAR_PERKS,
  PEACE_MILESTONES,
  PEACE_PERKS,
  buildPeaceStreaks,
  daysUntilMmDd,
  isTodayMmDd,
  isTruceActive,
  shouldStale,
  thisYear,
} from "@/lib/house-economy";
import { addCentralDays, isFindOutOverdue } from "@/lib/find-out";
import { isPerkExpired } from "@/lib/perks";
import type { AppRole } from "@/lib/roles";
import type { AppSettings, Offense, Profile, SeverityLabels } from "@/lib/types";
import { toCentralYmd } from "@/lib/utils";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

async function notify(
  sql: Sql,
  userEmail: string,
  title: string,
  body: string,
  kind: string,
  href: string | null,
  householdId: string,
) {
  if (!userEmail) return;
  await sql`
    insert into notifications (id, user_email, title, body, kind, href, read, created_at, household_id)
    values (
      ${uid()},
      ${userEmail.toLowerCase()},
      ${title},
      ${body},
      ${kind},
      ${href},
      0,
      ${new Date().toISOString()},
      ${householdId}
    )
  `;
}

async function memberEmails(sql: Sql, householdId: string) {
  return sql<{ email: string; role: string }>`
    select email, role from household_members where household_id = ${householdId}
  `;
}

async function alreadyNudged(
  sql: Sql,
  householdId: string,
  email: string,
  kind: string,
  targetId: string,
  sentOn: string,
) {
  const rows = await sql<{ id: string }>`
    select id from nudge_log
    where household_id = ${householdId}
      and lower(user_email) = ${email.toLowerCase()}
      and kind = ${kind}
      and target_id = ${targetId}
      and sent_on = ${sentOn}
    limit 1
  `;
  return rows.length > 0;
}

async function markNudged(
  sql: Sql,
  householdId: string,
  email: string,
  kind: string,
  targetId: string,
  sentOn: string,
) {
  await sql`
    insert into nudge_log (id, household_id, user_email, kind, target_id, sent_on)
    values (${uid()}, ${householdId}, ${email.toLowerCase()}, ${kind}, ${targetId}, ${sentOn})
    on conflict do nothing
  `;
}

async function insertPerk(
  sql: Sql,
  input: {
    householdId: string;
    title: string;
    body: string;
    kind: string;
    assignedToRole: AppRole;
    grantedByRole: AppRole;
    grantedByEmail: string;
    source: string;
    sourceId: string | null;
    expiresOn: string | null;
  },
) {
  const id = uid();
  const now = new Date().toISOString();
  await sql`
    insert into perks (
      id, household_id, title, body, kind, status,
      granted_by_role, granted_by_email, assigned_to_role,
      source, source_id, expires_on, honor_note, created_at, updated_at
    ) values (
      ${id},
      ${input.householdId},
      ${input.title},
      ${input.body},
      ${input.kind},
      ${"available"},
      ${input.grantedByRole},
      ${input.grantedByEmail},
      ${input.assignedToRole},
      ${input.source},
      ${input.sourceId},
      ${input.expiresOn},
      ${""},
      ${now},
      ${now}
    )
  `;
  return id;
}

export async function runHousekeeping(input: {
  sql: Sql;
  householdId: string;
  profile: Profile;
  settings: AppSettings;
}): Promise<void> {
  const { sql, householdId, profile, settings } = input;
  const today = toCentralYmd(new Date());
  const year = thisYear();
  const members = await memberEmails(sql, householdId);
  const emailFor = (role: AppRole) =>
    members.find((m) => m.role === role)?.email?.toLowerCase() ?? "";

  const hhRows = await sql<Record<string, unknown>>`
    select truce_until from households where id = ${householdId} limit 1
  `;
  const truceUntil =
    hhRows[0]?.truce_until == null || hhRows[0]?.truce_until === ""
      ? null
      : String(hhRows[0].truce_until).slice(0, 10);
  const truceOn = isTruceActive(truceUntil, today);

  // Statute of limitations
  if (settings.statuteDays > 0) {
    const openRows = await sql<Record<string, unknown>>`
      select id, date, status, archived, statute_reset_on
      from offenses
      where household_id = ${householdId}
        and status in ('open', 'pattern')
        and coalesce(archived, 0) = 0
    `;
    for (const row of openRows) {
      const fake: Pick<Offense, "date" | "status" | "archived" | "statuteResetOn"> = {
        date: String(row.date),
        status: String(row.status) as Offense["status"],
        archived: Number(row.archived ?? 0) === 1,
        statuteResetOn:
          row.statute_reset_on == null || row.statute_reset_on === ""
            ? null
            : String(row.statute_reset_on).slice(0, 10),
      };
      if (shouldStale(fake, settings.statuteDays, today)) {
        await sql`update offenses set status = 'stale', updated_at = ${new Date().toISOString()} where id = ${String(row.id)}`;
      }
    }
  }

  // Release matured bonds
  const dueBonds = await sql<Record<string, unknown>>`
    select * from bonds
    where household_id = ${householdId}
      and status = 'escrow'
      and releases_on <= ${today}
  `;
  for (const row of dueBonds) {
    const assigned = String(row.assigned_to_role) as AppRole;
    const grantor = String(row.granted_by_role) as AppRole;
    const perkId = await insertPerk(sql, {
      householdId,
      title: String(row.title),
      body: String(row.body ?? ""),
      kind: String(row.kind ?? "favor"),
      assignedToRole: assigned,
      grantedByRole: grantor,
      grantedByEmail: String(row.granted_by_email ?? ""),
      source: "bond",
      sourceId: String(row.id),
      expiresOn: addCentralDays(21),
    });
    await sql`
      update bonds
      set status = 'released',
          perk_id = ${perkId},
          resolved_at = ${new Date().toISOString()},
          note = 'Clean. Bond Released.',
          updated_at = ${new Date().toISOString()}
      where id = ${String(row.id)}
    `;
    const em = emailFor(assigned);
    if (em) {
      await notify(
        sql,
        em,
        "Bond Released — Perk Banked",
        String(row.title),
        "perk",
        "perks",
        householdId,
      );
    }
  }

  // Peace streak payouts
  const offenseRows = await sql<Record<string, unknown>>`
    select date, against_role, archived, status from offenses where household_id = ${householdId}
  `;
  const offenses = offenseRows.map((r) => ({
    date: String(r.date),
    againstRole: String(r.against_role) as AppRole,
    archived: Number(r.archived ?? 0) === 1,
    status: String(r.status) as Offense["status"],
  }));
  const streaks = buildPeaceStreaks(offenses);
  for (const streak of streaks) {
    if (streak.streakStart === "clean-start") continue;
    const other: AppRole = streak.role === "tracker" ? "subject" : "tracker";
    for (const milestone of PEACE_MILESTONES) {
      if (streak.days < milestone) continue;
      const existing = await sql<{ id: string }>`
        select id from peace_payouts
        where household_id = ${householdId}
          and assigned_to_role = ${streak.role}
          and milestone_days = ${milestone}
          and streak_start = ${streak.streakStart}
        limit 1
      `;
      if (existing[0]) continue;
      const spec = PEACE_PERKS[milestone];
      const perkId = await insertPerk(sql, {
        householdId,
        title: spec.title,
        body: spec.body,
        kind: spec.kind,
        assignedToRole: streak.role,
        grantedByRole: other,
        grantedByEmail: emailFor(other) || "ledger@fafo",
        source: "peace_streak",
        sourceId: `${milestone}`,
        expiresOn: addCentralDays(spec.expiresDays),
      });
      await sql`
        insert into peace_payouts (
          id, household_id, assigned_to_role, milestone_days, streak_start, perk_id, paid_on
        ) values (
          ${uid()}, ${householdId}, ${streak.role}, ${milestone}, ${streak.streakStart}, ${perkId}, ${today}
        )
        on conflict do nothing
      `;
      const em = emailFor(streak.role);
      if (em) {
        await notify(
          sql,
          em,
          `${milestone}-Day Peace Streak — Perk Banked`,
          spec.title,
          "perk",
          "perks",
          householdId,
        );
      }
    }
  }

  // Calendar acts
  const acts: { kind: string; role: AppRole | "both"; ymd: string; label: string }[] = [
    { kind: "anniversary", role: "both", ymd: profile.anniversary, label: "Anniversary" },
    { kind: "tracker_bday", role: "tracker", ymd: profile.trackerBirthday, label: "Birthday" },
    { kind: "subject_bday", role: "subject", ymd: profile.subjectBirthday, label: "Birthday" },
  ];
  for (const act of acts) {
    if (!isTodayMmDd(act.ymd, today)) continue;
    const already = await sql<{ id: string }>`
      select id from calendar_acts
      where household_id = ${householdId} and kind = ${act.kind} and year = ${year}
      limit 1
    `;
    if (already[0]) continue;

    const recipients: AppRole[] = act.role === "both" ? ["tracker", "subject"] : [act.role];
    const spec = act.kind === "anniversary" ? CALENDAR_PERKS.anniversary : CALENDAR_PERKS.birthday;
    let lastPerk: string | null = null;
    for (const role of recipients) {
      const other: AppRole = role === "tracker" ? "subject" : "tracker";
      lastPerk = await insertPerk(sql, {
        householdId,
        title: spec.title,
        body: spec.body,
        kind: spec.kind,
        assignedToRole: role,
        grantedByRole: other,
        grantedByEmail: emailFor(other) || "ledger@fafo",
        source: "calendar_act",
        sourceId: act.kind,
        expiresOn: addCentralDays(spec.expiresDays),
      });
      const em = emailFor(role);
      if (em) {
        await notify(
          sql,
          em,
          `${act.label} Act — Perk Banked`,
          spec.title,
          "calendar",
          "perks",
          householdId,
        );
      }
    }
    await sql`
      insert into calendar_acts (id, household_id, kind, year, perk_id, acted_on)
      values (${uid()}, ${householdId}, ${act.kind}, ${year}, ${lastPerk}, ${today})
      on conflict do nothing
    `;
    if (act.kind === "anniversary") {
      await sql`update households set amnesty_on = ${today} where id = ${householdId}`;
      for (const m of members) {
        await notify(
          sql,
          m.email,
          "Anniversary Amnesty Is Open",
          "Waive One Open Find Out Today. Use It Or Lose It.",
          "calendar",
          "findout",
          householdId,
        );
      }
    }
  }

  // Nudges — skip if we already sent today
  const foRows = await sql<Record<string, unknown>>`
    select id, title, assigned_to_role, issued_by_role, status, due_date
    from find_outs where household_id = ${householdId}
  `;
  if (!truceOn) {
    for (const row of foRows) {
      const fo = {
        status: String(row.status) as "issued" | "acknowledged" | "served" | "waived" | "appealed",
        dueDate: row.due_date == null || row.due_date === "" ? null : String(row.due_date).slice(0, 10),
      };
      if (!isFindOutOverdue(fo)) continue;
      const assigned = String(row.assigned_to_role) as AppRole;
      const em = emailFor(assigned);
      if (!em) continue;
      if (await alreadyNudged(sql, householdId, em, "fo_overdue", String(row.id), today)) continue;
      await notify(sql, em, "Find Out Is Overdue", String(row.title), "nudge", "findout", householdId);
      await markNudged(sql, householdId, em, "fo_overdue", String(row.id), today);
    }
  }

  const perkRows = await sql<Record<string, unknown>>`
    select id, title, assigned_to_role, status, expires_on
    from perks where household_id = ${householdId} and status in ('available', 'pending')
  `;
  const soon = addCentralDays(2);
  for (const row of perkRows) {
    const expires =
      row.expires_on == null || row.expires_on === "" ? null : String(row.expires_on).slice(0, 10);
    if (!expires || expires > soon) continue;
    if (isPerkExpired({ status: String(row.status) as "available", expiresOn: expires })) continue;
    const em = emailFor(String(row.assigned_to_role) as AppRole);
    if (!em) continue;
    if (await alreadyNudged(sql, householdId, em, "perk_expiring", String(row.id), today)) continue;
    await notify(
      sql,
      em,
      expires === today ? "Perk Expires Today" : "Perk Expires In 48 Hours",
      String(row.title),
      "nudge",
      "perks",
      householdId,
    );
    await markNudged(sql, householdId, em, "perk_expiring", String(row.id), today);
  }

  for (const act of acts) {
    const days = daysUntilMmDd(act.ymd, today);
    if (days !== 3) continue;
    for (const m of members) {
      if (await alreadyNudged(sql, householdId, m.email, "calendar_soon", act.kind, today)) continue;
      await notify(
        sql,
        m.email,
        `${act.label} In 3 Days. Don't Mess This Up.`,
        act.label === "Anniversary"
          ? "Three Days. A Perk Drops On The Day. Don't Log Something Stupid Tonight."
          : "Birthday In Three Days. Be Decent.",
        "nudge",
        "board",
        householdId,
      );
      await markNudged(sql, householdId, m.email, "calendar_soon", act.kind, today);
    }
  }
}

export function emptySettings(): AppSettings {
  return {
    severityLabels: {} as SeverityLabels,
    purgeForgivenDays: 0,
    statuteDays: 45,
    coolingOffMinutes: 20,
  };
}
