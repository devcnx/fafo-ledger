# FAFO Ledger

Private multi-household offense ledgers. **Anyone can sign up** (solo or couple). Brittaney Perry-Morgan & Michael Lucido keep their original shared ledger, tied to their accounts.

## Your Household (seeded)

| Person | Email | Role |
| --- | --- | --- |
| Brittaney | `bperrymorgan@me.com` | Owner / tracker |
| Michael | `spacehoodstalian@gmail.com` | Partner / subject |

Default password is set in `src/lib/seed.server.ts` (anniversary date). Household id: `hh-perry-lucido` (stable). Invite code: `FAFO0616`.

All times use **America/Chicago (Central)**.

## New users

1. **Sign Up** on the login page  
2. Choose **Just Me (Solo)**, **Me + Someone**, or **Join with Invite Code**  
3. Customize party names, anniversary, birthdays in Settings  
4. Share the household **invite code** so a partner can join and dispute

## Stack

- React 19 + TypeScript + Vite
- TanStack Start / Router
- Tailwind CSS v4
- Better Auth (email/password)
- PGLite (local) / Postgres when `DATABASE_URL` is set
- Multi-tenant `households` + `household_members` (migration `0004_households.sql`)

## Local development

```bash
npm install
npm run dev   # http://0.0.0.0:8080
npm run typecheck
npm run build
```

## Deploy

Built for Vercel via Nitro. Set `DATABASE_URL` to Postgres for production persistence.
