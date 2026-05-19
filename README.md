# HabitQuest

HabitQuest is a dark-mode RPG habit tracker built with Next.js App Router, TypeScript, Tailwind CSS, Zustand, Framer Motion, Recharts, and browser `localStorage`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- Zustand
- Framer Motion
- Recharts
- `localStorage` persistence only

## Routes

- `/` dashboard
- `/shop` cosmetic shop and inventory
- `/achievements` achievement ledger

## Project structure

```text
src/
  app/
    achievements/page.tsx
    shop/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/habitquest/
    achievement-grid.tsx
    achievements-page.tsx
    achievements-panel.tsx
    analytics-panel.tsx
    app-shell.tsx
    challenge-card.tsx
    daily-reward-card.tsx
    exp-progress.tsx
    floating-reward-layer.tsx
    glass-card.tsx
    habit-form-modal.tsx
    habit-list.tsx
    habit-quest-app.tsx
    navigation.tsx
    profile-panel.tsx
    purchase-modal.tsx
    reward-toast-layer.tsx
    shop-item-card.tsx
    shop-page.tsx
    stat-card.tsx
    unlock-tracker.tsx
  hooks/
    use-habitquest-hydration.ts
  lib/
    habitquest/
      constants.ts
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

- All persistent game data is stored under one `localStorage` key: `habitquest::save`.
- The Zustand store hydrates only on the client after mount.
- The store runs a single reconciliation pass that updates:
  - daily login coins
  - daily completion coin rewards
  - challenge progress
  - achievement unlocks and rewards
  - level unlocks
- If stored data is missing or invalid, the app falls back to seeded data.

## Core gamification rules

- Daily login: `+1` coin once per local day
- Perfect day reward: `+2` coins only if all habits due today are completed and at least `3` due habits were completed
- Habit EXP:
  - Easy: `10`
  - Medium: `25`
  - Hard: `50`
- Level requirement: `level * 100`

## Future backend migration

The clean migration path is:

1. Keep the domain types and gameplay logic in `src/lib/habitquest/`.
2. Replace `storage.ts` with API or Server Action persistence.
3. Load user data from a database during authenticated app boot.
4. Keep Zustand as the client cache and optimistic UI layer.

Good first tables are:

- `users`
- `habits`
- `habit_completions`
- `exp_history`
- `wallets`
- `shop_items`
- `owned_cosmetics`
- `equipped_cosmetics`
- `achievements`
- `challenges`
- `level_unlocks`
