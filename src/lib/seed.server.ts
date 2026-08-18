import { ensureDbReady, getSql } from "@/lib/db";
import { DEFAULT_PROFILE, STARTER_TEMPLATES } from "@/lib/constants";
import { LEGACY_HOUSEHOLD } from "@/lib/roles";

const SEED_PASSWORD = "20250616";

const globalRef = globalThis as typeof globalThis & {
  __fafoSeedPromise__?: Promise<void>;
};

/**
 * Seed Brittaney & Michael accounts + bind them to the legacy household.
 * Idempotent. Does NOT wipe household data.
 */
export async function ensureSeedUsers(): Promise<void> {
  if (!globalRef.__fafoSeedPromise__) {
    globalRef.__fafoSeedPromise__ = (async () => {
      await ensureDbReady();
      const { auth } = await import("@/lib/auth/server");
      const sql = await getSql();

      const accounts = [
        {
          email: LEGACY_HOUSEHOLD.tracker.email,
          name: LEGACY_HOUSEHOLD.tracker.name,
          password: SEED_PASSWORD,
        },
        {
          email: LEGACY_HOUSEHOLD.subject.email,
          name: LEGACY_HOUSEHOLD.subject.name,
          password: SEED_PASSWORD,
        },
      ];

      for (const account of accounts) {
        const existing = await sql<{ id: string }>`
          select id from "user" where lower(email) = ${account.email.toLowerCase()} limit 1
        `;
        if (existing.length > 0) continue;

        try {
          await auth.api.signUpEmail({
            body: {
              email: account.email,
              password: account.password,
              name: account.name,
            },
            headers: new Headers({
              origin: "http://localhost:8080",
              "content-type": "application/json",
            }),
          });
        } catch (err) {
          console.warn("[seed] signUpEmail:", account.email, err);
        }
      }

      // Ensure legacy household + profile exist (migration also does this)
      await sql`
        insert into households (id, name, mode, invite_code, created_by_user_id)
        values (
          ${LEGACY_HOUSEHOLD.id},
          ${LEGACY_HOUSEHOLD.name},
          'couple',
          ${LEGACY_HOUSEHOLD.inviteCode},
          ''
        )
        on conflict (id) do nothing
      `;

      for (const member of [
        {
          id: "hm-brittaney",
          email: LEGACY_HOUSEHOLD.tracker.email,
          name: LEGACY_HOUSEHOLD.tracker.name,
          role: "tracker",
          owner: 1,
        },
        {
          id: "hm-michael",
          email: LEGACY_HOUSEHOLD.subject.email,
          name: LEGACY_HOUSEHOLD.subject.name,
          role: "subject",
          owner: 0,
        },
      ]) {
        await sql`
          insert into household_members (
            id, household_id, user_id, email, display_name, role, is_owner
          ) values (
            ${member.id},
            ${LEGACY_HOUSEHOLD.id},
            null,
            ${member.email},
            ${member.name},
            ${member.role},
            ${member.owner}
          )
          on conflict (id) do nothing
        `;
      }

      // Bind user_id when accounts exist
      for (const email of [
        LEGACY_HOUSEHOLD.tracker.email,
        LEGACY_HOUSEHOLD.subject.email,
      ]) {
        const u = await sql<{ id: string }>`
          select id from "user" where lower(email) = ${email.toLowerCase()} limit 1
        `;
        if (u[0]) {
          await sql`
            update household_members
            set user_id = ${u[0].id}
            where household_id = ${LEGACY_HOUSEHOLD.id}
              and lower(email) = ${email.toLowerCase()}
              and (user_id is null or user_id = '')
          `;
        }
      }

      const profile = await sql`
        select id from ledger_profile where id = ${LEGACY_HOUSEHOLD.id} limit 1
      `;
      if (profile.length === 0) {
        await sql`
          insert into ledger_profile (
            id, tracker_name, subject_name, anniversary,
            tracker_birthday, subject_birthday, notes
          ) values (
            ${LEGACY_HOUSEHOLD.id},
            ${DEFAULT_PROFILE.trackerName},
            ${DEFAULT_PROFILE.subjectName},
            ${DEFAULT_PROFILE.anniversary},
            ${DEFAULT_PROFILE.trackerBirthday},
            ${DEFAULT_PROFILE.subjectBirthday},
            ${DEFAULT_PROFILE.notes}
          )
        `;
      }

      await sql`
        insert into ledger_settings (id, severity_labels, purge_forgiven_days)
        values (${LEGACY_HOUSEHOLD.id}, '{}', 0)
        on conflict (id) do nothing
      `;

      // Ensure starter templates exist and stay Title Case (fixes legacy seed copy)
      for (const tpl of STARTER_TEMPLATES) {
        const existing = await sql<{ id: string }>`
          select id from offense_templates
          where id = ${tpl.id} or id = ${`${tpl.id}-${LEGACY_HOUSEHOLD.id}`}
          limit 1
        `;
        if (existing[0]) {
          await sql`
            update offense_templates
            set title = ${tpl.title},
                category = ${tpl.category},
                severity = ${tpl.severity},
                description = ${tpl.description},
                impact = ${tpl.impact},
                household_id = ${LEGACY_HOUSEHOLD.id}
            where id = ${existing[0].id}
          `;
        } else {
          await sql`
            insert into offense_templates (
              id, household_id, title, category, severity, description, impact, owner_role
            ) values (
              ${tpl.id},
              ${LEGACY_HOUSEHOLD.id},
              ${tpl.title},
              ${tpl.category},
              ${tpl.severity},
              ${tpl.description},
              ${tpl.impact},
              ${"both"}
            )
            on conflict (id) do update set
              title = excluded.title,
              category = excluded.category,
              severity = excluded.severity,
              description = excluded.description,
              impact = excluded.impact
          `;
        }
      }
    })().catch((err) => {
      globalRef.__fafoSeedPromise__ = undefined;
      throw err;
    });
  }
  await globalRef.__fafoSeedPromise__;

  const sql = await getSql();
  await sql.query(`
    create table if not exists find_outs (
      id text primary key,
      household_id text not null,
      offense_id text,
      title text not null,
      body text not null default '',
      issued_by_role text not null,
      issued_by_email text not null,
      assigned_to_role text not null,
      status text not null default 'issued',
      due_date text,
      acknowledged_at timestamptz,
      served_at timestamptz,
      escalation_note text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await sql.query(
    `create index if not exists find_outs_household_idx on find_outs (household_id, created_at desc)`,
  );
  await sql.query(
    `alter table find_outs add column if not exists repeat_count integer not null default 1`,
  );
  await sql.query(`
    create table if not exists perks (
      id text primary key,
      household_id text not null,
      title text not null,
      body text not null default '',
      kind text not null default 'favor',
      status text not null default 'available',
      granted_by_role text not null,
      granted_by_email text not null,
      assigned_to_role text not null,
      source text not null default 'manual',
      source_id text,
      expires_on text,
      redeemed_at timestamptz,
      honor_note text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await sql.query(
    `create index if not exists perks_household_idx on perks (household_id, created_at desc)`,
  );
  for (const tpl of STARTER_TEMPLATES) {
    await sql`
      update offense_templates
      set title = ${tpl.title},
          category = ${tpl.category},
          description = ${tpl.description},
          impact = ${tpl.impact}
      where id = ${tpl.id}
         or id = ${`${tpl.id}-${LEGACY_HOUSEHOLD.id}`}
         or id like ${tpl.id + '-%'}
    `;
  }
  // Catch legacy sentence-case rows even if ids differ
  const legacyTitles: Record<string, string> = {
    "left dishes in the sink again": "Left Dishes In The Sink Again",
    "late without a text": "Late Without A Text",
    "phone during quality time": "Phone During Quality Time",
    "tone / attitude": "Tone / Attitude",
    "lied or omitted something": "Lied Or Omitted Something",
  };
  for (const [from, to] of Object.entries(legacyTitles)) {
    const tpl = STARTER_TEMPLATES.find((x) => x.title === to);
    if (!tpl) continue;
    await sql`
      update offense_templates
      set title = ${tpl.title},
          category = ${tpl.category},
          description = ${tpl.description},
          impact = ${tpl.impact}
      where lower(title) = ${from}
    `;
  }
}
