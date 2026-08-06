import { ensureDbReady, getSql } from "@/lib/db";
import { HOUSEHOLD } from "@/lib/roles";
import { DEFAULT_PROFILE } from "@/lib/constants";

const SEED_PASSWORD = "20250616";

const globalRef = globalThis as typeof globalThis & {
  __fafoSeedPromise__?: Promise<void>;
};

/**
 * Create the two household email/password accounts and default profile.
 * Idempotent. Runs once per process after DB is ready.
 */
export async function ensureSeedUsers(): Promise<void> {
  if (!globalRef.__fafoSeedPromise__) {
    globalRef.__fafoSeedPromise__ = (async () => {
      await ensureDbReady();
      const { auth } = await import("@/lib/auth/server");
      const sql = await getSql();

      const accounts = [
        {
          email: HOUSEHOLD.tracker.email,
          name: HOUSEHOLD.tracker.name,
          password: SEED_PASSWORD,
        },
        {
          email: HOUSEHOLD.subject.email,
          name: HOUSEHOLD.subject.name,
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
          // Race / already exists
          console.warn("[seed] signUpEmail:", account.email, err);
        }
      }

      const profile = await sql`select id from ledger_profile where id = 'default' limit 1`;
      if (profile.length === 0) {
        await sql`
          insert into ledger_profile (
            id, tracker_name, subject_name, anniversary,
            tracker_birthday, subject_birthday, notes
          ) values (
            'default',
            ${DEFAULT_PROFILE.trackerName},
            ${DEFAULT_PROFILE.subjectName},
            ${DEFAULT_PROFILE.anniversary},
            ${DEFAULT_PROFILE.trackerBirthday},
            ${DEFAULT_PROFILE.subjectBirthday},
            ${DEFAULT_PROFILE.notes}
          )
        `;
      }
    })().catch((err) => {
      globalRef.__fafoSeedPromise__ = undefined;
      throw err;
    });
  }
  await globalRef.__fafoSeedPromise__;
}
