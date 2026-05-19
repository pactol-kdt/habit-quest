"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { AchievementsPanel } from "~/components/habitquest/achievements-panel";
import { AnalyticsPanel } from "~/components/habitquest/analytics-panel";
import { ChallengeCard } from "~/components/habitquest/challenge-card";
import { DailyRewardCard } from "~/components/habitquest/daily-reward-card";
import { ExpProgress } from "~/components/habitquest/exp-progress";
import { GlassCard } from "~/components/habitquest/glass-card";
import { HabitFormModal } from "~/components/habitquest/habit-form-modal";
import { HabitList } from "~/components/habitquest/habit-list";
import { StatCard } from "~/components/habitquest/stat-card";
import { UnlockTracker } from "~/components/habitquest/unlock-tracker";
import { cn } from "~/lib/ui/cn";
import {
  formatNumber,
  getCompletionRate,
  getDailyRewardSummary,
  getLevelState,
  getMotivationalGreeting,
  getWeeklyActivity,
  hasCompletionForDate,
  isFeatureUnlocked,
} from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { Habit } from "~/types/habitquest";

export function HabitQuestApp() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitFocusMode, setHabitFocusMode] = useState(false);

  const store = useHabitQuestStore((state) => state);

  const {
    hydrated,
    habits,
    completions,
    achievements,
    userProgress,
    wallet,
    dailyRewards,
    challenges,
    shopItems,
    levelUnlocks,
    equippedItems,
    createHabit,
    updateHabit,
    deleteHabit,
    completeHabitForToday,
    claimChallengeReward,
  } = store;

  const todayReward = useMemo(
    () =>
      hydrated
        ? getDailyRewardSummary(dailyRewards, {
            habits,
            completions,
            achievements,
            challenges,
            shopItems,
            levelUnlocks,
            equippedItems,
            wallet,
            dailyRewards,
            userProgress,
          })
        : null,
    [
      achievements,
      challenges,
      completions,
      dailyRewards,
      equippedItems,
      habits,
      hydrated,
      levelUnlocks,
      shopItems,
      userProgress,
      wallet,
    ],
  );

  const todaysHabits = useMemo(
    () => (todayReward ? todayReward.dueHabits : []),
    [todayReward],
  );

  const completedHabitIds = useMemo(
    () =>
      new Set(
        todaysHabits
          .filter((habit) =>
            hasCompletionForDate(completions, habit.id, todayReward?.dateKey ?? ""),
          )
          .map((habit) => habit.id),
      ),
    [completions, todaysHabits, todayReward?.dateKey],
  );

  const levelState = getLevelState(userProgress.totalExp);
  const weeklyActivity = useMemo(
    () =>
      getWeeklyActivity({
        habits,
        completions,
        achievements,
        challenges,
        shopItems,
        levelUnlocks,
        equippedItems,
        wallet,
        dailyRewards,
        userProgress,
      }),
    [
      achievements,
      challenges,
      completions,
      dailyRewards,
      equippedItems,
      habits,
      levelUnlocks,
      shopItems,
      userProgress,
      wallet,
    ],
  );
  const weeklyCompletionRate = useMemo(
    () =>
      getCompletionRate({
        habits,
        completions,
        achievements,
        challenges,
        shopItems,
        levelUnlocks,
        equippedItems,
        wallet,
        dailyRewards,
        userProgress,
      }),
    [
      achievements,
      challenges,
      completions,
      dailyRewards,
      equippedItems,
      habits,
      levelUnlocks,
      shopItems,
      userProgress,
      wallet,
    ],
  );

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
        <div className="glass-panel animate-pulse rounded-[2rem] p-8">
          <div className="h-10 w-52 rounded-full bg-white/10" />
          <div className="mt-5 h-24 rounded-[2rem] bg-white/6" />
        </div>
        <div className="grid gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="glass-panel h-36 animate-pulse rounded-[2rem] bg-white/5"
            />
          ))}
        </div>
      </main>
    );
  }

  const weeklyChallenge = challenges.find((challenge) => challenge.period === "weekly");
  const monthlyChallenge = challenges.find((challenge) => challenge.period === "monthly");
  const weeklyLocked = !isFeatureUnlocked(levelUnlocks, "weekly-challenges");
  const monthlyLocked = !isFeatureUnlocked(levelUnlocks, "monthly-challenges");

  return (
    <main className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <motion.div
        className="grid gap-4 md:gap-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <GlassCard className="panel-highlight overflow-hidden rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
          <div className="grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-cyan-200 md:px-4 md:text-xs md:tracking-[0.28em]">
                  HabitQuest
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-muted)] md:px-4 md:text-xs md:tracking-[0.28em]">
                  Advanced Gamification
                </span>
              </div>
              <div className="space-y-3">
                <h1 className="section-title max-w-3xl text-3xl leading-tight text-white sm:text-4xl md:text-6xl">
                  Progression that pays you back for consistency.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-lg md:leading-7">
                  {getMotivationalGreeting(userProgress)}
                </p>
              </div>
              <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="min-h-12 rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
                >
                  Create habit
                </button>
                <button
                  type="button"
                  onClick={() => setHabitFocusMode((current) => !current)}
                  className={cn(
                    "min-h-12 rounded-full border px-5 py-3 text-sm transition",
                    habitFocusMode
                      ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 bg-white/5 text-[var(--color-text-muted)] hover:border-white/20 hover:text-white",
                  )}
                >
                  {habitFocusMode ? "Exit habit focus" : "Focus on habits"}
                </button>
                <a
                  href="#contracts"
                  className="flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
                >
                  View challenges
                </a>
              </div>
            </div>

            <div className="glass-panel rounded-[1.5rem] border border-white/10 p-4 md:rounded-[1.75rem] md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                    Adventurer status
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                    Level {userProgress.level}
                  </h2>
                </div>
                <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-center md:px-4 md:py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">
                    Coins
                  </p>
                  <p className="text-xl font-semibold text-amber-100 md:text-2xl">
                    {wallet.totalCoins}
                  </p>
                </div>
              </div>
              <ExpProgress
                level={userProgress.level}
                currentExp={levelState.expIntoLevel}
                requiredExp={levelState.requiredExp}
                progressPercent={levelState.progressPercent}
              />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">Current streak</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {userProgress.currentStreak} days
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/4 p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">Best streak</p>
                  <p className="mt-1 text-2xl font-semibold text-white">
                    {userProgress.bestStreak} days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
          <StatCard
            label="Total EXP"
            value={formatNumber(userProgress.totalExp)}
            helper="All habit, streak, challenge, and achievement EXP is persistent."
            accent="text-cyan-200"
            icon={<span>XP</span>}
          />
          <StatCard
            label="Coin Balance"
            value={formatNumber(wallet.totalCoins)}
            helper="Daily rewards and challenges are your main coin income."
            accent="text-amber-200"
            icon={<span>Co</span>}
          />
          <StatCard
            label="Current Streak"
            value={`${userProgress.currentStreak}d`}
            helper="Major streak milestones trigger bonus EXP automatically."
            accent="text-emerald-200"
            icon={<span>St</span>}
          />
          <StatCard
            label="Completed Habits"
            value={formatNumber(userProgress.totalCompletedHabits)}
            helper={`${todayReward.completedCount}/${todayReward.dueHabits.length || 0} due today.`}
            accent="text-pink-200"
            icon={<span>Q</span>}
          />
        </section>

        {!habitFocusMode ? (
          <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="max-h-[24rem] overflow-y-auto rounded-[1.75rem] md:max-h-[28rem] md:rounded-[2rem]">
              <DailyRewardCard
                loginClaimed={todayReward.loginClaimed}
                completionClaimed={todayReward.completionClaimed}
                completedCount={todayReward.completedCount}
                dueCount={todayReward.dueHabits.length}
                qualifiesForReward={todayReward.qualifiesForReward}
                dailyLoginCoins={todayReward.dailyLoginCoins}
                dailyCompletionCoins={todayReward.dailyCompletionCoins}
              />
            </div>
            <div className="max-h-[24rem] overflow-y-auto rounded-[1.75rem] md:max-h-[28rem] md:rounded-[2rem]">
              <UnlockTracker level={userProgress.level} levelUnlocks={levelUnlocks} />
            </div>
          </section>
        ) : null}

        <section
          className={cn(
            "grid gap-6",
            habitFocusMode ? "xl:grid-cols-1" : "xl:grid-cols-[1.4fr_0.9fr]",
          )}
        >
          <GlassCard
            className={cn(
              "h-full overflow-hidden",
              habitFocusMode
                ? "border-cyan-300/20 shadow-[0_0_0_1px_rgba(77,216,255,0.08),0_30px_80px_rgba(34,211,238,0.14)]"
                : "",
            )}
          >
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                  Today&apos;s Habits
                </p>
                <h2 className="section-title mt-2 text-2xl text-white">
                  {habitFocusMode ? "Habit focus mode" : "Daily quest board"}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {habitFocusMode
                    ? "This view trims dashboard noise and keeps the habit board front and center."
                    : "Complete the due habits below to bank EXP, streaks, and daily reward coins."}
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
              >
                Add new habit
              </button>
            </div>

            <div
              className={cn(
                "overflow-y-auto pr-1",
                habitFocusMode ? "max-h-[60vh] md:max-h-[42rem]" : "max-h-[55vh] md:max-h-[34rem]",
              )}
            >
              <HabitList
                habits={todaysHabits}
                completedHabitIds={completedHabitIds}
                onComplete={completeHabitForToday}
                onEdit={openEditModal}
                onDelete={deleteHabit}
              />
            </div>
          </GlassCard>

          {!habitFocusMode ? (
            <GlassCard className="h-full overflow-hidden">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                  Today&apos;s Economy
                </p>
                <h2 className="section-title mt-2 text-2xl text-white">Reward status</h2>
              </div>
              <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1 md:max-h-[34rem]">
                <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">Daily login</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {todayReward.loginClaimed ? "Claimed" : "Not yet claimed"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">Perfect day reward</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {todayReward.completionClaimed
                      ? "Claimed"
                      : todayReward.qualifiesForReward
                        ? "Eligible now"
                        : "Finish every due habit and reach 3 clears"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">Weekly challenge</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {weeklyChallenge?.progress ?? 0}/{weeklyChallenge?.target ?? 0}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
                  <p className="text-sm text-[var(--color-text-muted)]">Habit completion today</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {todayReward.completedCount}/{todayReward.dueHabits.length || 0}
                  </p>
                </div>
              </div>
            </GlassCard>
          ) : null}
        </section>

        {!habitFocusMode ? (
          <>
            <section id="contracts" className="grid gap-6 xl:grid-cols-2">
              {weeklyChallenge ? (
                <div className="max-h-[24rem] overflow-y-auto rounded-[1.75rem] md:max-h-[30rem] md:rounded-[2rem]">
                  <ChallengeCard
                    challenge={weeklyChallenge}
                    locked={weeklyLocked}
                    lockLabel={weeklyLocked ? "Unlock weekly challenges at level 3." : null}
                    onClaim={claimChallengeReward}
                  />
                </div>
              ) : null}
              {monthlyChallenge ? (
                <div className="max-h-[24rem] overflow-y-auto rounded-[1.75rem] md:max-h-[30rem] md:rounded-[2rem]">
                  <ChallengeCard
                    challenge={monthlyChallenge}
                    locked={monthlyLocked}
                    lockLabel={monthlyLocked ? "Unlock monthly challenges at level 7." : null}
                    onClaim={claimChallengeReward}
                  />
                </div>
              ) : null}
            </section>

            <section className="grid gap-6 xl:grid-cols-1">
              <div className="max-h-[24rem] overflow-y-auto rounded-[1.75rem] md:max-h-[34rem] md:rounded-[2rem]">
                <AchievementsPanel achievements={achievements} />
              </div>
            </section>

            <section id="analytics" className="max-h-[62vh] overflow-y-auto rounded-[1.75rem] md:max-h-[42rem] md:rounded-[2rem]">
              <AnalyticsPanel
                weeklyActivity={weeklyActivity}
                weeklyCompletionRate={weeklyCompletionRate}
                totalCompletedHabits={userProgress.totalCompletedHabits}
                bestStreak={userProgress.bestStreak}
              />
            </section>
          </>
        ) : null}
      </motion.div>

      <HabitFormModal
        open={modalOpen}
        habit={editingHabit}
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
