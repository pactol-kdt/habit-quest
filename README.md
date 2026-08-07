# HabitQuest

HabitQuest is a dark-mode RPG habit tracker built with Next.js App Router, TypeScript, Tailwind CSS, Zustand, Framer Motion, Recharts, MySQL, and email/password auth.

## Run locally

```bash
npm install
npm run dev
```

`next dev` loads [`.env.development`](.env.development). Optional overrides go in `.env.development.local` (gitignored).

Open `http://localhost:3000`.

## Environment

| File | When loaded | Commit? |
|------|-------------|---------|
| `.env.development` | `next dev` | yes (safe local defaults) |
| `.env.production` | `next build` / `next start` | no — create from example |
| `.env.production.example` | template only | yes |
| `.env.local` | always overrides | no |

Variables:

- `AUTH_SECRET` — session signing secret (required in production, 32+ chars recommended)
- `DATABASE_URL` — MySQL URL (local default: `mysql://root@127.0.0.1:3306/habitquest`)
- `ADMIN_EMAIL` — optional; that email becomes admin on signup (first account is always admin)

Production setup:

```bash
cp .env.production.example .env.production
# edit AUTH_SECRET + DATABASE_URL, then:
npm run build && npm start
```

```bash
npm test
```

Runs focused Node test-runner checks (via `tsx`) for recurrence, challenges, completion cleanup, and reminders.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Zustand (optimistic client cache)
- Framer Motion / Recharts
- MySQL (`habitquest` database) for accounts + cloud saves
- Signed-in progress is cloud-only (no localStorage write while authenticated)

## Routes

- `/` dashboard
- `/habits` all-habits management
- `/shop` cosmetic shop and inventory
- `/achievements` achievement ledger
- `/settings` account sync, profile, reminders, export/import/reset

## Auth & sync

1. HabitQuest requires sign-in — the app shell shows an auth gate until a session exists.
2. Users have roles: `user` (default) or `admin` (first signup, or `ADMIN_EMAIL`).
3. Catalogs (shop, achievements, challenges, quests, unlocks, season rewards) live in MySQL `catalog_*` tables and are editable at `/admin`.
4. Player progress stays in normalized per-user tables; catalogs merge in on load.
5. Sign out flushes cloud sync and returns you to the auth gate.

Server Actions:

- `src/app/actions/auth.ts` — sign up / sign in / sign out / session
- `src/app/actions/habitquest-sync.ts` — validate / pull / push / auth boot sync

## Project structure

```text
src/
  app/
    achievements/page.tsx
    actions/auth.ts
    actions/habitquest-sync.ts
    habits/page.tsx
    settings/page.tsx
    shop/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/habitquest/
    ...
  hooks/
    use-habitquest-hydration.ts
    use-habitquest-reminders.ts
  lib/
    auth/
    db/
    habitquest/
      cloud-sync.ts
      constants.ts
      reminders.ts
      schema.ts
      seed.ts
      storage.ts
      utils.ts
    ui/
      cn.ts
  store/
    habitquest-store.ts
  types/
    habitquest.ts
```

## Persistence model

- Guest extract uses `localStorage` key `habitquest::save` once, then deletes it.
- Signed-in cloud: normalized MySQL tables (`habits`, `habit_completions`, `user_progress`, `wallets`, …).
- Legacy JSON blobs in `habitquest_saves` are migrated into rows on first pull, then removed.
- Zustand hydrates on the client after mount, then pulls cloud data when a session cookie exists.
- Settings still supports JSON export/import/reset for manual backups.

## Core gamification rules

- Daily login: `+1` coin once per local day
- Perfect day reward: `+2` coins only if all habits due today are completed and at least `3` due habits were completed
- Habit EXP:
  - Easy: `10`
  - Medium: `25`
  - Hard: `50`
- Level requirement: `level * 100`
- Weekly habits are weekday-based (chosen weekday), not “every 7 days from creation”
- `streak-days` challenges measure consecutive completion days inside the challenge window

## Future hardening

- Split `habitquest_saves` JSON into the normalized SQL tables in `src/lib/habitquest/schema.ts`
- Point `DATABASE_URL` at a hosted MySQL when you leave local Laragon
- Replace email/password with OAuth if needed
- Add a service worker for true push reminders
