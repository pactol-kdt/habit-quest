# Changelog

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
