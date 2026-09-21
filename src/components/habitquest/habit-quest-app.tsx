"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { AvatarWithFrame } from "~/components/habitquest/cosmetic-art";
import { ExpProgress } from "~/components/habitquest/exp-progress";
import { GlassCard } from "~/components/habitquest/glass-card";
import { HabitFormModal } from "~/components/habitquest/habit-form-modal";
import { HabitList } from "~/components/habitquest/habit-list";
import { ClaimableRewardsStrip } from "~/components/habitquest/claimable-rewards-strip";
import { StreakDevSlider } from "~/components/habitquest/streak-dev-slider";
import { StreakFlame } from "~/components/habitquest/streak-flame";
import { sortHabitsByLoop } from "~/lib/habitquest/habit-loop";
import { getStreakFireTier } from "~/lib/habitquest/streak-fire-tier";
import {
  getDailyRewardSummary,
  getLevelState,
  getMotivationalGreeting,
  getProfileDisplay,
  hasCompletionForDate,
} from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import type { Habit } from "~/types/habitquest";

export function HabitQuestApp() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [devStreakPreview, setDevStreakPreview] = useState<number | null>(null);

  const store = useHabitQuestStore((state) => state);
  const { userProgress, weeklyBoss } = useEffectiveProgress();
  const streakForDisplay = devStreakPreview ?? userProgress.currentStreak;

  const {
    hydrated,
    habits,
    completions,
    shopItems,
    equippedItems,
    dailyRewards,
    settings,
    createHabit,
    updateHabit,
    deleteHabit,
    completeHabitForToday,
    uncompleteHabitForToday,
    pendingHabitIds,
    pendingHabitActions,
    projectSave,
  } = store;

  const fullData = useMemo(
    () => (hydrated ? projectSave() : null),
    [
      hydrated,
      projectSave,
      store.version,
      store.habits,
      store.completions,
      store.achievements,
      store.challenges,
      store.shopItems,
      store.levelUnlocks,
      store.equippedItems,
      store.wallet,
      store.dailyRewards,
      store.userProgress,
      store.settings,
      store.rewardSystems,
      store.questArcs,
      store.seasonPass,
      store.weeklyBoss,
    ],
  );

  const todayReward = useMemo(
    () => (fullData ? getDailyRewardSummary(dailyRewards, fullData) : null),
    [dailyRewards, fullData],
  );

  const dueHabits = useMemo(
    () => (todayReward ? todayReward.dueHabits : []),
    [todayReward],
  );

  const completedHabitIds = useMemo(
    () =>
      new Set(
        dueHabits
          .filter((habit) =>
            hasCompletionForDate(completions, habit.id, todayReward?.dateKey ?? ""),
          )
          .map((habit) => habit.id),
      ),
    [completions, dueHabits, todayReward?.dateKey],
  );

  const todaysHabits = useMemo(
    () => sortHabitsByLoop(dueHabits, { completedIds: completedHabitIds }),
    [completedHabitIds, dueHabits],
  );

  const levelState = getLevelState(userProgress.totalExp);
  const hasHabits = habits.length > 0;

  function openCreateModal() {
    setEditingHabit(null);
    setModalOpen(true);
  }

  function openEditModal(habit: Habit) {
    setEditingHabit(habit);
    setModalOpen(true);
  }

  if (!hydrated || !todayReward) {
    return (
      <main className="grid gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-40 animate-pulse rounded-[2rem]" />
        <div className="glass-panel h-64 animate-pulse rounded-[2rem]" />
      </main>
    );
  }

  const displayName = settings.displayName.trim() || "Traveler";
  const profile = getProfileDisplay(shopItems, equippedItems);
  const greeting = getMotivationalGreeting(userProgress);
  const streakTier = getStreakFireTier(streakForDisplay);
  const dueCount = todayReward.dueHabits.length;
  const dueLabel =
    dueCount === 0
      ? "Nothing due"
      : `${todayReward.completedCount}/${dueCount} due`;

  const weekPercent = weeklyBoss.maxHp
    ? ((weeklyBoss.maxHp - weeklyBoss.effectiveHp) / weeklyBoss.maxHp) * 100
    : 0;
  const weekStatus = weeklyBoss.defeated
    ? weeklyBoss.rewardClaimed
      ? "Cleared"
      : "Reward ready"
    : "In progress";

  return (
    <main className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <motion.div
        className="grid gap-4 md:gap-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/profile" className="shrink-0 self-start sm:self-center">
            <AvatarWithFrame
              avatar={profile.avatar}
              frame={profile.frame}
              className="h-16 w-16 border border-white/10 shadow-[0_0_28px_rgba(77,216,255,0.14)] sm:h-20 sm:w-20"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="section-title truncate text-2xl text-white sm:text-3xl">
              {greeting.headline}
              <span className="font-sans text-lg font-normal tracking-normal text-white/70 sm:text-xl">
                {`, ${displayName}`}
              </span>
            </h1>
            <p className="mt-1 truncate text-sm text-[var(--color-text-muted)]">
              {profile.title?.name ? `${profile.title.name} · ` : ""}
              {dueLabel}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{greeting.support}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 text-sm text-orange-50"
                title={`${streakForDisplay}-day streak`}
              >
                <StreakFlame tier={streakTier} size="xs" />
                <span className="tabular-nums font-semibold">{streakForDisplay}</span>
              </span>
              <div className="min-w-[10rem] flex-1 sm:max-w-xs">
                <ExpProgress
                  compact
                  level={userProgress.level}
                  currentExp={levelState.expIntoLevel}
                  requiredExp={levelState.requiredExp}
                  progressPercent={levelState.progressPercent}
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-12 shrink-0 rounded-full hq-btn-accent px-5 py-2.5 text-sm font-semibold text-slate-950 sm:min-h-11"
          >
            Add a habit
          </button>
        </section>

        <StreakDevSlider
          liveStreak={userProgress.currentStreak}
          previewStreak={devStreakPreview}
          onPreviewChange={setDevStreakPreview}
        />

        <GlassCard className="overflow-hidden rounded-[1.75rem]">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              Today
            </p>
            <h2 className="section-title mt-1 text-2xl text-white">Your quest</h2>
          </div>

          <HabitList
            habits={todaysHabits}
            allHabits={habits}
            completedHabitIds={completedHabitIds}
            pendingHabitIds={pendingHabitIds}
            pendingHabitActions={pendingHabitActions}
            emptyMessage={
              hasHabits
                ? "Nothing is due today. Add another habit or check Habits."
                : "No habits yet. Add one to start today's quest — attach it to something you already do."
            }
            emptyActionLabel="Add a habit"
            onEmptyAction={openCreateModal}
            onComplete={completeHabitForToday}
            onUncomplete={uncompleteHabitForToday}
            onEdit={openEditModal}
            onDelete={deleteHabit}
          />
        </GlassCard>

        <Link href="/boss" className="block rounded-[1.75rem] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50">
          <GlassCard className="rounded-[1.75rem] p-4 transition hover:border-white/20 md:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                  {weekStatus}
                </p>
                <h2 className="section-title mt-1 text-xl text-white md:text-2xl">
                  Weekly challenge
                </h2>
              </div>
              <p className="text-sm font-semibold tabular-nums text-cyan-100">
                {weeklyBoss.effectiveHp}/{weeklyBoss.maxHp} left
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300 transition-all"
                style={{ width: `${Math.min(100, weekPercent)}%` }}
              />
            </div>
            {weeklyBoss.defeated && !weeklyBoss.rewardClaimed ? (
              <p className="mt-3 text-sm text-amber-100/90">Reward ready — open Week</p>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">Open Week</p>
            )}
          </GlassCard>
        </Link>

        <ClaimableRewardsStrip />
      </motion.div>

      <HabitFormModal
        open={modalOpen}
        habit={editingHabit}
        habits={habits}
        onClose={() => setModalOpen(false)}
        onSubmit={(values) => {
          if (editingHabit) {
            updateHabit(editingHabit.id, values);
            return;
          }
          createHabit(values);
        }}
      />
    </main>
  );
}
