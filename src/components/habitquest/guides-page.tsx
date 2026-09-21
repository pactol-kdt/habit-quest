"use client";

import Link from "next/link";
import { GlassCard } from "~/components/habitquest/glass-card";
import {
  COMEBACK_COINS,
  COMEBACK_EXP,
  COMEBACK_MIN_GAP_DAYS,
  COMBO_COIN_THRESHOLDS,
  COMBO_EXP_PER_EXTRA_CLEAR,
  CRIT_CHANCE,
  MAX_STREAK_FREEZES,
  STREAK_FREEZE_COST,
  STREAK_FREEZE_MILESTONES,
} from "~/lib/habitquest/constants";
import { PAGE_HEROES } from "~/lib/habitquest/copy";

const COMBO_THRESHOLDS_LABEL = COMBO_COIN_THRESHOLDS.join("/");
const FREEZE_MILESTONES_LABEL = STREAK_FREEZE_MILESTONES.join("/");
const CRIT_PERCENT = Math.round(CRIT_CHANCE * 100);

const GUIDE_SECTIONS = [
  {
    title: "The habit loop",
    body: "Every lasting habit is trigger → motivation → response → reward. HabitQuest lets you design the loop: stack a trigger onto something you already do, name the motivation (identity or feeling), set a bare minimum response, then enjoy the intrinsic win plus EXP that lands when you tap Done.",
  },
  {
    title: "Habit stacking",
    body: "Chains only: After habit 1 → habit 2 → habit 3. Each habit can have one next step. Free-text triggers (“after coffee”) still work anytime; linked stacks unlock a single Next glow when the previous clear lands.",
  },
  {
    title: "Triggers & reminders",
    body: "Time and place are optional cues — when and where you usually do the habit. They sort today's list. If reminders are on, phone push fires during that cue's hour while the habit is still due (around the hour, not the exact minute). Habits without a time get a 6:00 AM digest. Times follow your timezone.",
  },
  {
    title: "Streaks & freezes",
    body: `Complete at least one habit each day to keep your streak. Freezes auto-spend when you miss exactly one day and return the next morning — that protected day still counts, so 10 days + one freeze + 10 days is a 21-day streak. Earn freezes at ${FREEZE_MILESTONES_LABEL}-day milestones, or buy one for ${STREAK_FREEZE_COST} coins (max ${MAX_STREAK_FREEZES} held).`,
  },
  {
    title: "Comeback bonus",
    body: `After a gap of ${COMEBACK_MIN_GAP_DAYS}+ days, your first clear of the day grants a comeback bonus (+${COMEBACK_COINS} coins, +${COMEBACK_EXP} EXP). Comebacks can only trigger about once per week.`,
  },
  {
    title: "Weekly challenge",
    body: "Open Week. Each habit fills this week's bar (harder habits fill more) — claim when it's full. The same page has a 15-clear contract for coins, EXP, and a title on first clear; later clears keep coins & EXP plus a small repeat bonus. Undo a Done today if you tapped by mistake.",
  },
  {
    title: "Undo today",
    body: "A Done grants EXP, season XP, combo, perfect-day coins, and weekly-bar progress immediately. Undo anytime today to take them back. Opening on a later day still catches up days you missed.",
  },
  {
    title: "Critical finishes",
    body: `Each habit has a ${CRIT_PERCENT}% chance to crit for double EXP once per day. Undo and redo keep the same roll — you can't re-roll for a crit. Stack them with hard habits for bigger swings.`,
  },
  {
    title: "Combo bonus",
    body: `Stack same-day finishes for combo rewards: +${COMBO_EXP_PER_EXTRA_CLEAR} EXP per finish after the first, plus coins at ${COMBO_THRESHOLDS_LABEL} finishes. Combo pays out as you clear.`,
  },
  {
    title: "Season rewards",
    body: "Available from level 1. Habit finishes contribute season XP (40 XP per level, track to level 30). Open Season to review tiers, claim rewards, and work the monthly climb (2000 EXP this month — title on first clear). Quest chapters unlock at level 3: complete habits, hard clears, or hold a streak, then claim coins, EXP, and exclusive themes. Claiming the finale finishes the season and counts toward Seasons finished. The track resets each calendar month.",
  },
  {
    title: "Themes",
    body: "Unlock at level 4. Equip themes from the shop to restyle app colors. Ember and Aurora come from quest chapters (outside the buy ladder). Purchasable themes unlock in order: Coastal Mist → Archive Sepia → Midnight.",
  },
  {
    title: "Cosmetics",
    body: "Titles, frames, and avatars fill out your profile. Buyable cosmetics unlock progressively within each category (cheapest tier first). Exclusive titles from challenges, quests, and the season finale sit outside that ladder. Season Cleared comes from claiming the season finale. Mid-tier frames (Ink Line, Forge Ring, Aurora Filigree) sit between Bronze and Galaxy.",
  },
  {
    title: "Account & sync",
    body: "You can try HabitQuest as a guest on this device. Create an account to keep progress across devices — while signed in, cloud PostgreSQL is authoritative and progress syncs automatically.",
  },
];

export function GuidesPage() {
  const hero = PAGE_HEROES.guides;

  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          {hero.eyebrow}
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
          {hero.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
          {hero.support}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/boss"
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            Weekly challenge
          </Link>
          <Link
            href="/season"
            className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            Season
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
