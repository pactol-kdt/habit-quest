"use client";

import Link from "next/link";
import { GlassCard } from "~/components/habitquest/glass-card";

const GUIDE_SECTIONS = [
  {
    title: "The habit loop",
    body: "Every lasting habit is trigger → motivation → response → reward. HabitQuest lets you design the loop: stack a trigger onto something you already do, name the motivation (identity or feeling), set a bare minimum response, then enjoy the intrinsic win plus pending EXP that banks at midnight.",
  },
  {
    title: "Habit stacking",
    body: "Chains only: After habit 1 → habit 2 → habit 3. Each habit can have one next step. Free-text triggers (“after coffee”) still work anytime; linked stacks unlock a single Next glow when the previous clear lands.",
  },
  {
    title: "Triggers & reminders",
    body: "Optional trigger time and place sit on each habit. In-tab reminders fire at each due habit’s trigger (falling back to 08:00). Push still sends a morning digest; stack language shows up in the copy when you have stacked habits due.",
  },
  {
    title: "Streaks & freezes",
    body: "Complete at least one habit each local day to keep your streak. Freezes auto-spend when you miss exactly one day and return the next morning. Earn freezes at 7/14/30-day milestones, or buy one for 20 coins (max 2 held).",
  },
  {
    title: "Comeback bonus",
    body: "After a gap of 3+ days, your first clear of the day grants a comeback bonus (+12 coins, +40 EXP). Comebacks can only trigger about once per week.",
  },
  {
    title: "Quest arcs",
    body: "Unlock at level 3. Progress chapters by completing habits, hard clears, or holding streaks. Claim chapter rewards for coins, EXP, and exclusive themes.",
  },
  {
    title: "Weekly & monthly challenges",
    body: "Weekly Contract (level 3): complete 15 habits this week. Monthly Ascension (level 7): earn 2000 EXP this month. Claim rewards and exclusive titles when the bar fills.",
  },
  {
    title: "Boss fight",
    body: "Every habit clear deals boss damage (hard hits hardest). All of today's progress — EXP, season XP, comeback, combo, perfect-day coins, and boss damage — stays pending until end of day so undos are safe.",
  },
  {
    title: "End-of-day lock-in",
    body: "Completing habits logs a pending clear immediately. Stats preview includes today, but permanent EXP, season tiers, comeback, combo, perfect-day coins, quest progress, and boss HP only lock in at local midnight on next open.",
  },
  {
    title: "Critical clears",
    body: "Each habit has a 12% chance to crit for double EXP once per day. Undo and redo keep the same roll — you can't re-roll for a crit. Stack them with hard habits for bigger swings.",
  },
  {
    title: "Combo bonus",
    body: "Stack same-day clears for combo rewards: +5 EXP per clear after the first, plus coins at 3/5/8 clears. Combo pays out when the day locks in.",
  },
  {
    title: "Season Pass",
    body: "Unlock at level 4. Habit clears contribute season XP. Open Season Pass in the nav to review tiers and claim rewards. The pass resets each calendar month.",
  },
  {
    title: "Themes",
    body: "Unlock at level 4. Equip themes from the shop to restyle app colors. Ember and Aurora come from quest chapters; Midnight is purchasable.",
  },
  {
    title: "Daily rewards",
    body: "Login grants +1 coin once per day. Perfect-day reward (+2 coins) requires finishing every habit due that day (and at least 3 due clears); it locks in at end of day with the rest of pending progress.",
  },
  {
    title: "Account & sync",
    body: "HabitQuest requires an account. While signed in, cloud PostgreSQL is authoritative and progress syncs automatically.",
  },
];

export function GuidesPage() {
  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Field Guide
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
          Lore & counsel
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
          Soft guidance for HabitQuest — stacking, loops, streaks, bosses, and the rest of the path.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/boss"
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            Boss fight
          </Link>
          <Link
            href="/season"
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            Season pass
          </Link>
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        {GUIDE_SECTIONS.map((section) => (
          <GlassCard key={section.title} className="h-full rounded-[1.75rem]">
            <h2 className="text-xl font-semibold text-white">{section.title}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              {section.body}
            </p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
