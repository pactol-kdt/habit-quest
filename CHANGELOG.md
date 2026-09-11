# Changelog

## 0.8.1 - Password Reset Production Fix

### Fixed
- Password-reset emails no longer 500 on Vercel: logo loads from the public URL when the filesystem/`sharp` path is unavailable, and mail failures are caught instead of crashing the route.

## 0.8.0 - Branded Password Reset

### Added
- Branded password-reset email (Cinzel + Space Grotesk, HabitQuest logo, light/dark via `prefers-color-scheme`).
- Optional `EMAIL_TLS_INSECURE=1` for local Resend sends behind corporate SSL inspection.

### Changed
- Password reset is enabled. Set `RESEND_API_KEY` / `EMAIL_FROM` (and `APP_URL` in production) to email reset links; without a key the URL is logged in the server console.

## 0.7.0 - Profile Page and Streak Integrity

### Added
- Compact current streak in the top bar (flame + count). The HabitQuest title hides below extra-wide screens so the chip has room.
- Dedicated Profile page with activity graph, identity, change password, and lifetime season / boss honor medals.

### Changed
- Settings keeps reminders and About. Account & sync and Backup were removed; activity, display name, honors, and sign out live on Profile.

### Fixed
- Streak no longer drops when a stale cloud save or a deleted habit wipes completion days. Today's clears count toward the streak; EXP still locks in at midnight.
- A streak freeze now bridges a one-day miss even after you clear habits on the day you return, so 10 days + one protected miss + 10 days stays a 21-day streak.

## 0.6.0 - Local Reminder Hours and Claim All

### Added
- Settings reminder time picker (player-local hour); push digest and follow-up use that time instead of a fixed UTC schedule.
- Claim all for ready challenge, quest, season, and boss rewards.
- Shared coin and EXP icons across reward and progress surfaces.

### Changed
- Background push uses 24 Hobby-safe daily crons (one per UTC hour) and matches each user's local reminder hour (+14h follow-up if habits are still due).
- Enabling push no longer resets `reminderTime` to 08:00.
- Clearing several habits in one go syncs through a single batch write.
- Locked achievements show a clearer silhouette treatment instead of plain Locked labels.
- Habit cards no longer force a minimum width that breaks the mobile habits page.

## 0.5.0 - Guest Play and Home Clarity

### Added
- Guest play: try HabitQuest on this device without an account; creating an account gathers local progress.
- Password reset via emailed link (Resend) is implemented but currently disabled.

### Changed
- Home now opens on today's habit board; streak, EXP, lock-in, and reward chrome sit behind Show streak, EXP & rewards.
- Habit cards are title, cue, and Clear, with Edit in a menu and a delete confirmation.
- First-create habit form is trigger + name; extra loop fields sit under Add optional details.
- Reminder copy uses the player's local clock; the notification prompt waits until after the first clear.
- Mobile tabs use icons plus labels; dialogs trap focus and honor reduced motion.
- Create buttons and empty states say Add a habit; stacking language stays in the form and tutorial.
- Combo moved off the Daily habits header into Show streak, EXP & rewards.
- Skip-to-content link; Progress/More sheet buttons no longer claim aria-current="page".

## 0.4.1 - How to Play and Habit Form Clarity

### Added
- Added a replayable how-to-play tutorial for new users (stack, clear, lock-in, daily loop), with replay from Habits.

### Changed
- Rewrote the stack-a-habit modal so the formula is one choice (a cue or another habit), with a live preview.
- Dropped “local” from lock-in and reminder copy (midnight, daily streak, 08:00).
- Clarified that habit trigger time is a cue, not a guaranteed alarm.

## 0.4.0 - Activity Graph and Dual Daily Push

### Added
- Added a habit activity graph on Settings with year selector.

### Changed
- Web Push now fires twice per UTC day: a digest at **00:00 UTC** and a follow-up at **14:00 UTC** if habits are still due (08:00 / 22:00 in UTC+8).

## 0.3.2 - Background Push Reminders

### Added
- Added Web Push reminders (service worker + VAPID + stored subscriptions) so daily alerts can fire when HabitQuest is closed.
- Added `/api/cron/reminders` dispatcher with timezone-aware once-per-day gating.
- Added Settings flow to enable push, send a real push test, and remove the subscription on disable.

### Changed
- Settings copy now describes push + cron instead of tab-only reminders.
- Reminders are fixed at **08:00 local time**; Vercel uses 24 Hobby-safe daily crons (one per UTC hour) and only notifies during that local hour.

## 0.3.1 - Focused Writes, Clarity UX, and Env Setup

### Added
- Added focused shop purchase / equip / unequip server actions with surgical wallet, ownership, and equipped-cosmetics writes.
- Added focused habit create / update / delete server actions with surgical habit and progress clawback writes.
- Added focused settings, onboarding, streak-freeze, and challenge / quest / season / boss claim server actions.
- Added Home claimable-rewards strip and Progress nav badges for ready payouts.
- Added dismissible lock-in tip after the first clear of a session.
- Added `.env.development`, `.env.production.example`, and clearer env docs for local vs production.
- Added regression tests for focused APIs, daily-login merge, and reminder timing.

### Changed
- Clarified the three former “pending” meanings: **Saving…** (sync), **Cleared today** (undoable clear), **Preview** (locks in tonight).
- Aligned coin display to **spendable wallet** everywhere; preview coins stay in Tonight’s lock-in.
- Clarified Daily Rewards (login auto-pays; perfect-day is preview until lock-in).
- Made sync-failure toasts sticky and prioritized over reward spam.
- Simplified onboarding to one welcome → create-habit path.
- Made Settings honest about tab-only reminders and account-backed backup (optional JSON snapshot + test notification).
- Reordered Home so the habit board comes before preview/stats chrome.
- Added Claim buttons on ready season tiers and Saving… states on reward claims.

### Fixed
- Stopped daily login from granting +1 coin on every refresh by merging `dailyRewards`, flushing the claim to MySQL immediately, and guarding duplicate claims in-session.
- Hardened reminders (permission-aware ticking, due-fire on enable).

## 0.3.0 - Accounts, Database Sync, and Progression Systems

### Added
- Added email/password auth with signed sessions, roles (`user` / `admin`), and an auth gate before the app shell.
- Added MySQL persistence for accounts, catalogs, and normalized per-user progress (Drizzle + server actions).
- Added focused habit complete/undo server actions with surgical DB writes instead of always pushing a full save blob.
- Added midnight day-settlement flow so habit EXP, combo, boss, and season progress lock in at day end.
- Added season pass, boss, leaderboard, guides, habits, settings, and admin catalog routes/pages.
- Added mobile bottom navigation, pending-progress UI, settlement recap, onboarding, celebrations, and habit reminders.
- Added theme catalog wiring so equipped themes actually drive app chrome and accent colors.
- Added local draft merge on hydrate so unsynced clears, undos, purchases, and daily-login claims survive refresh races.

### Changed
- Moved signed-in progress to database-backed sync with a durable browser cache for race safety.
- Expanded shop/cosmetics, reward systems, combo handling, and dashboard/mobile layouts around the new progression model.
- Capped visible reward toasts and improved mobile toast placement above the tab bar.

### Fixed
- Fixed stale combo display when `comboDate` was from a prior day.
- Hardened complete/undo against races with pending UI, rollback on failure, and full-save overwrite protection.
- Fixed purchases and habit progress being lost on refresh when only a debounced full save was queued.

## 0.2.1 - Mobile Dashboard and Habit Focus Update

### Added
- Added a `Focus on habits` dashboard mode to prioritize the daily habit board.
- Added stronger visual highlighting for the habit section when focus mode is active.

### Changed
- Removed the dashboard profile section to reduce clutter and keep the main screen task-oriented.
- Updated major dashboard containers to use max-height constraints with internal scrolling.
- Improved mobile responsiveness across the dashboard, navigation, shop, and habit modal flows.
- Made mobile actions larger and easier to tap, with better stacking and spacing on small screens.
- Made navigation and shop category controls more mobile-friendly with horizontal scrolling behavior where needed.
- Tightened hero copy and section density for smaller viewports.

### Fixed
- Normalized habit list label rendering and improved narrow-screen action layouts.

## 0.2.0 - HabitQuest Gamification Release

### Added
- Built the full HabitQuest dashboard experience on Next.js App Router with TypeScript, Tailwind, Zustand, Framer Motion, and Recharts.
- Added local-first persistence for habits, completions, EXP history, wallet, achievements, challenges, cosmetics, equipped items, daily rewards, and level unlocks.
- Added habit CRUD, daily completion tracking, EXP progression, streak bonuses, analytics, and seeded starter data.
- Added daily login coin rewards and perfect-day completion coin rewards with duplicate-claim protection.
- Added weekly and monthly challenge systems with progress tracking, reward claiming, and exclusive title rewards.
- Added RPG-style shop, inventory, purchase flow, equip flow, rarity tiers, and locked states.
- Added full achievement system with unlock rewards, notifications, and dedicated achievements page.
- Added level-based feature unlocks for titles, weekly challenges, frames, monthly challenges, and legendary cosmetics.
- Added routed pages for `/shop` and `/achievements`.
- Added actual SVG avatar and profile frame artwork for shop and profile previews.

### Changed
- Replaced the starter landing page with a dark RPG dashboard UI.
- Refactored app state around a centralized gamification reconciliation flow in the Zustand store.
- Updated the app shell, navigation, profile display, and dashboard layout for the new progression systems.
- Updated README with routes, structure, persistence model, and migration guidance.

### Fixed
- Added migration-safe localStorage loading so legacy saved data does not crash when new schema fields are missing.
- Hardened reward logic to prevent duplicate daily rewards and duplicate achievement payouts.
