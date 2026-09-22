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
    body: "Every lasting habit is trigger → motivation → response → reward. HabitQuest lets you design the loop: stack a trigger onto something you already do, name the motivation (identity or feeling), set a bare minimum response, then enjoy the intrinsic win plus level progress that lands when you tap Done.",
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
    body: `After a gap of ${COMEBACK_MIN_GAP_DAYS}+ days, your first clear of the day grants a comeback bonus (+${COMEBACK_COINS} coins, +${COMEBACK_EXP} level progress). Comebacks can only trigger about once per week.`,
  },
  {
    title: "This week",
    body: "Complete 15 habits this week. The bar on Today tracks that goal, and you claim it there when it is full. Week shows the same goal. The first time you finish it grants a title; later weeks keep coins and level progress plus a small repeat bonus.",
  },
  {
    title: "Undo today",
    body: "A Done adds level progress, season progress, and progress toward this week's 15 habits immediately, plus coins. Undo anytime today to take them back. If you already spent those coins, undo can leave your balance below zero until you earn more — Shop says so before you buy. Opening on a later day still catches up days you missed.",
  },
  {
    title: "Bonus finish",
    body: `Each habit has a ${CRIT_PERCENT}% chance to grant double level progress once per day. Undo and redo keep the same roll. Harder habits swing more.`,
  },
  {
    title: "Several in one day",
    body: `Each finish after the first adds +${COMBO_EXP_PER_EXTRA_CLEAR} level progress, plus coins at ${COMBO_THRESHOLDS_LABEL} finishes. It pays as you go. Today shows how many you've finished.`,
  },
  {
    title: "Season rewards",
    body: "Available from level 1. Habit finishes contribute season XP (40 XP per level, track to level 30). Open Season to review tiers, claim rewards, and work the monthly climb (2000 level progress this month — title on first clear). Quest chapters unlock at level 3: complete habits, hard clears, or hold a streak, then claim coins, level progress, and exclusive themes. Claiming the finale finishes the season and counts toward Seasons finished. The track resets each calendar month.",
  },
  {
    title: "Themes",
    body: "Unlock at level 4. Equip themes from the shop to restyle app colors. Ember and Aurora come from quest chapters. Buyable themes are Coastal Mist, Archive Sepia, and Midnight.",
  },
  {
    title: "Cosmetics",
    body: "Titles, frames, and avatars fill out your profile. Buy any unlocked cosmetic you can afford — exclusive titles from challenges, quests, and the season finale are earned, not bought. Season Cleared comes from claiming the season finale.",
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
            This week
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
