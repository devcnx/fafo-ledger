# FAFO Ledger

Private household ledger for **Brittaney Perry-Morgan** and **Michael Lucido**.

Track offenses, attach receipts, dispute/appeal entries, apologies, consequences, credits, quotes, and printable FAFO reports. All times use **America/Chicago (Central)**.

## Stack

- React 19 + TypeScript + Vite
- TanStack Start / Router
- Tailwind CSS v4
- Better Auth (email/password)
- PGLite (local) / Postgres when `DATABASE_URL` is set

## Accounts

Seeded household logins (change passwords after first deploy if needed):

| Person | Email | Role |
| --- | --- | --- |
| Brittaney | `bperrymorgan@me.com` | Tracker (full access) |
| Michael | `spacehoodstalian@gmail.com` | Subject (log + dispute) |

Default password is set in `src/lib/seed.server.ts` (anniversary date).

## Local development

```bash
npm install
npm run dev   # http://0.0.0.0:8080
```

```bash
npm run typecheck
npm run build
```

## Deploy

Built for Vercel via Nitro (`nitro({ preset: "vercel" })` on build). Set `DATABASE_URL` to a Postgres connection for production persistence; without it, the app uses embedded PGLite (fine for preview, not multi-instance prod).

## Features

- Bidirectional logging (both partners)
- Disputes/appeals with counter-evidence
- Evidence: photos, voice notes, pasted text
- Peace streak, heat map, pattern warnings
- Apologies + remorse meter
- Consequences board
- Love/credit ledger
- Quotes wall
- Case file scoreboard
- Notifications
- Custom severity labels & templates
- Light/dark theme + optional device PIN
- Export JSON/CSV · printable FAFO packet
