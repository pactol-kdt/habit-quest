"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AchievementsPanel } from "~/components/habitquest/achievements-panel";
import { AnalyticsPanel } from "~/components/habitquest/analytics-panel";
import { ChallengeCard } from "~/components/habitquest/challenge-card";
import { DailyRewardCard } from "~/components/habitquest/daily-reward-card";
import { ExpProgress } from "~/components/habitquest/exp-progress";
import { StreakDisplay } from "~/components/habitquest/streak-display";
import { StreakDevSlider } from "~/components/habitquest/streak-dev-slider";
import { GlassCard } from "~/components/habitquest/glass-card";
import { HabitFormModal } from "~/components/habitquest/habit-form-modal";
import { HabitList } from "~/components/habitquest/habit-list";
import { PendingProgressCard } from "~/components/habitquest/pending-progress-card";
import { ClaimableRewardsStrip } from "~/components/habitquest/claimable-rewards-strip";
import { LockInTipBanner } from "~/components/habitquest/lock-in-tip-banner";
import { RewardSystemsPanel } from "~/components/habitquest/reward-systems-panel";
import { UnlockTracker } from "~/components/habitquest/unlock-tracker";
import { cn } from "~/lib/ui/cn";
import { getComboRewards, getNextComboMilestone } from "~/lib/habitquest/combo";
import { sortHabitsByLoop } from "~/lib/habitquest/habit-loop";
import {
  formatNumber,
  getCompletionRate,
  getDailyRewardSummary,
  getLevelState,
  getMotivationalGreeting,
  getTodayDateKey,
  getWeeklyActivity,
  hasCompletionForDate,
  isFeatureUnlocked,
} from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import type { Habit } from "~/types/habitquest";

export function HabitQuestApp() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [devStreakPreview, setDevStreakPreview] = useState<number | null>(null);

  const store = useHabitQuestStore((state) => state);
  const { userProgress } = useEffectiveProgress();
  const streakForDisplay = devStreakPreview ?? userProgress.currentStreak;
  const bestStreakForDisplay = Math.max(userProgress.bestStreak, streakForDisplay);
  const spendableCoins = store.wallet.totalCoins;

  const {
    hydrated,
    habits,
    completions,
    achievements,
    challenges,
    dailyRewards,
    levelUnlocks,
    settings,
    rewardSystems,
    createHabit,
    updateHabit,
    deleteHabit,
    completeHabitForToday,
    uncompleteHabitForToday,
    claimChallengeReward,
    pendingHabitIds,
    pendingHabitActions,
    pendingClaimIds,
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
  const weeklyActivity = useMemo(
    () => (fullData ? getWeeklyActivity(fullData) : []),
    [fullData],
  );
  const weeklyCompletionRate = useMemo(
    () => (fullData ? getCompletionRate(fullData) : 0),
    [fullData],
  );

  const today = getTodayDateKey();
  const todayCombo =
    rewardSystems.comboDate === today && rewardSystems.todayCombo > 0
      ? rewardSystems.todayCombo
      : 0;
  const comboPreview = getComboRewards(todayCombo);
  const nextMilestone = getNextComboMilestone(todayCombo);
  const hasHabits = habits.length > 0;
  const needsFirstHabit = hydrated && settings.onboardingCompleted && !hasHabits;

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

  const displayName = settings.displayName.trim() || "Adventurer";
  const weeklyChallenge = challenges.find((challenge) => challenge.period === "weekly") ?? null;
  const monthlyChallenge = challenges.find((challenge) => challenge.period === "monthly") ?? null;
  const weeklyUnlocked = isFeatureUnlocked(levelUnlocks, "weekly-challenges");
  const monthlyUnlocked = isFeatureUnlocked(levelUnlocks, "monthly-challenges");

  return (
    <main className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <motion.div
        className="grid gap-4 md:gap-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {needsFirstHabit ? (
          <GlassCard className="rounded-[1.75rem] border-cyan-300/20 p-5 md:p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">First step</p>
            <h2 className="section-title mt-2 text-2xl text-white">Stack your first habit</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
              Attach it to something you already do — after coffee, after sitting down. Progress
              stays a soft preview until midnight, so undos remain kind.{" "}
              <Link href="/guides" className="hq-text-accent underline-offset-2 hover:underline">
                Read the guides
              </Link>
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 rounded-full hq-btn-accent px-5 py-3 text-sm font-semibold text-slate-950"
            >
              Stack a habit
            </button>
          </GlassCard>
        ) : null}

        <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                {displayName}
              </p>
              <h1 className="section-title mt-2 text-xl text-white sm:text-2xl md:text-3xl">
                {getMotivationalGreeting(userProgress)}
              </h1>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={openCreateModal}
                className="min-h-12 rounded-full hq-btn-accent px-4 py-2.5 text-sm font-semibold text-slate-950 sm:min-h-11 sm:px-5"
              >
                Stack a habit
              </button>
              <Link
                href="/habits"
                className="flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-white sm:min-h-11 sm:px-5"
              >
                Manage all
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <StreakDisplay
              featured
              currentStreak={streakForDisplay}
              bestStreak={bestStreakForDisplay}
            />
            <StreakDevSlider
              liveStreak={userProgress.currentStreak}
              previewStreak={devStreakPreview}
              onPreviewChange={setDevStreakPreview}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
            <ExpProgress
              compact
              level={userProgress.level}
              currentExp={levelState.expIntoLevel}
              requiredExp={levelState.requiredExp}
              progressPercent={levelState.progressPercent}
            />
            <div className="hidden h-8 w-px shrink-0 bg-white/10 sm:block" aria-hidden />
            <div className="flex shrink-0 items-center justify-between gap-4 text-sm sm:flex-col sm:items-end sm:justify-center sm:text-right">
              <span className="text-[var(--color-text-muted)]">Spendable</span>
              <span className="text-lg font-semibold text-amber-100">
                {formatNumber(spendableCoins)} coins
              </span>
            </div>
          </div>
        </GlassCard>

        <ClaimableRewardsStrip />

        <GlassCard className="overflow-hidden rounded-[1.75rem]">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                Today&apos;s path
              </p>
              <h2 className="section-title mt-2 text-2xl text-white">Daily habits</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {todayReward.completedCount}/{todayReward.dueHabits.length || 0} due clears —
                ordered by trigger time and stack. Undo stays gentle until tonight&apos;s lock-in.
              </p>
            </div>
            <div className="rounded-3xl border border-pink-300/20 bg-pink-300/8 px-4 py-3 text-sm text-pink-100">
              Combo x{todayCombo || 0}
              {comboPreview.exp > 0 ? ` · +${comboPreview.exp} EXP` : ""}
              {nextMilestone ? ` · next coin at ${nextMilestone}` : todayCombo >= 8 ? " · maxed" : ""}
            </div>
          </div>

          <HabitList
            habits={todaysHabits}
            allHabits={habits}
            completedHabitIds={completedHabitIds}
            pendingHabitIds={pendingHabitIds}
            pendingHabitActions={pendingHabitActions}
            emptyMessage={
              hasHabits
                ? "Nothing is due today. Add another habit or check Manage all."
                : "No habits yet — stack your first loop and begin gathering EXP."
            }
            emptyActionLabel="Stack a habit"
            onEmptyAction={openCreateModal}
            onComplete={completeHabitForToday}
            onUncomplete={uncompleteHabitForToday}
            onEdit={openEditModal}
            onDelete={deleteHabit}
          />
        </GlassCard>

        <LockInTipBanner />

        <PendingProgressCard />

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <DailyRewardCard
            loginClaimed={todayReward.loginClaimed}
            completionClaimed={todayReward.completionClaimed}
            completedCount={todayReward.completedCount}
            dueCount={todayReward.dueHabits.length}
            qualifiesForReward={todayReward.qualifiesForReward}
            dailyLoginCoins={todayReward.dailyLoginCoins}
            dailyCompletionCoins={todayReward.dailyCompletionCoins}
          />
          <UnlockTracker level={userProgress.level} levelUnlocks={levelUnlocks} />
        </section>

        {(weeklyChallenge || monthlyChallenge) ? (
          <section id="contracts" className="grid gap-6 xl:grid-cols-2">
            {weeklyChallenge ? (
              <ChallengeCard
                challenge={weeklyChallenge}
                locked={!weeklyUnlocked}
                lockLabel="Unlocks at level 3 with Weekly Challenges."
                pending={pendingClaimIds.includes(`challenge:${weeklyChallenge.id}`)}
                onClaim={claimChallengeReward}
              />
            ) : null}
            {monthlyChallenge ? (
              <ChallengeCard
                challenge={monthlyChallenge}
                locked={!monthlyUnlocked}
                lockLabel="Unlocks at level 7 with Monthly Challenges."
                pending={pendingClaimIds.includes(`challenge:${monthlyChallenge.id}`)}
                onClaim={claimChallengeReward}
              />
            ) : null}
          </section>
        ) : null}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowMore((current) => !current)}
            className={cn(
              "min-h-12 w-full max-w-md rounded-full border px-5 py-2.5 text-sm transition sm:w-auto",
              showMore
                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                : "border-white/10 bg-white/5 text-[var(--color-text-muted)] hover:text-white",
            )}
          >
            {showMore ? "Hide momentum & analytics" : "Show more stats"}
          </button>
        </div>

        {showMore ? (
          <>
            <RewardSystemsPanel />
            <AchievementsPanel achievements={achievements} />
            <AnalyticsPanel
              weeklyActivity={weeklyActivity}
              weeklyCompletionRate={weeklyCompletionRate}
              totalCompletedHabits={userProgress.totalCompletedHabits}
              bestStreak={userProgress.bestStreak}
            />
          </>
        ) : null}
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
