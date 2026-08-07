"use client";

import { useMemo } from "react";
import { GlassCard } from "~/components/habitquest/glass-card";
import {
  COMBO_EXP_PER_EXTRA_CLEAR,
  MAX_STREAK_FREEZES,
  SETTLEMENT_LOCK_HINT,
  STREAK_FREEZE_COST,
} from "~/lib/habitquest/constants";
import { getComboRewards } from "~/lib/habitquest/combo";
import {
  getActiveQuestArc,
  getWeeklyRecap,
} from "~/lib/habitquest/rewards";
import { getEffectiveQuestArcs } from "~/lib/habitquest/day-settlement";
import { cn } from "~/lib/ui/cn";
import { formatNumber, getTodayDateKey, isFeatureUnlocked } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function RewardSystemsPanel() {
  const store = useHabitQuestStore((state) => state);

  const {
    rewardSystems,
    questArcs,
    levelUnlocks,
    wallet,
    claimQuestArcReward,
    buyStreakFreeze,
    pendingClaimIds,
    projectSave,
  } = store;

  const data = useMemo(() => projectSave(), [
    store.version,
    store.habits,
    store.completions,
    store.rewardSystems,
    store.questArcs,
    store.seasonPass,
    store.weeklyBoss,
    store.userProgress,
    projectSave,
  ]);

  const previewArcs = useMemo(() => getEffectiveQuestArcs(data), [data]);
  const activeArc = getActiveQuestArc(previewArcs);
  const settledActive = getActiveQuestArc(questArcs);
  const recap = getWeeklyRecap(data);
  const today = getTodayDateKey();
  const todayCombo =
    rewardSystems.comboDate === today && rewardSystems.todayCombo > 0
      ? rewardSystems.todayCombo
      : 0;
  const comboPreview = getComboRewards(todayCombo);

  const questUnlocked = isFeatureUnlocked(levelUnlocks, "quest-arcs");

  return (
    <GlassCard className="h-full overflow-hidden">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          Reward Systems
        </p>
        <h2 className="section-title mt-2 text-2xl text-white">Momentum arsenal</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Freezes, combos, and quest arcs. Today&apos;s habit progress stays in preview —
          {` ${SETTLEMENT_LOCK_HINT}`} Boss fight and season pass live in their own menus.
        </p>
      </div>

      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1 md:max-h-[42rem]">
        <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Streak freezes</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {rewardSystems.streakFreezes}/{MAX_STREAK_FREEZES}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Auto-protects one missed day when you return the next morning.
              </p>
            </div>
            <button
              type="button"
              onClick={buyStreakFreeze}
              disabled={
                pendingClaimIds.includes("streak-freeze") ||
                rewardSystems.streakFreezes >= MAX_STREAK_FREEZES ||
                wallet.totalCoins < STREAK_FREEZE_COST
              }
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pendingClaimIds.includes("streak-freeze")
                ? "Saving…"
                : `Buy (${STREAK_FREEZE_COST}c)`}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="rounded-full bg-white/5 px-3 py-1">
              Combo today: {todayCombo}
              {comboPreview.exp > 0
                ? ` · +${comboPreview.exp} EXP in preview (+${COMBO_EXP_PER_EXTRA_CLEAR}/extra clear)`
                : ""}
              {comboPreview.coins > 0 ? ` · +${comboPreview.coins}c at 3/5/8` : ""}
            </span>
            <span className="rounded-full bg-white/5 px-3 py-1">
              Shields: {rewardSystems.streakShieldDates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).length}
            </span>
          </div>
        </div>

        <div
          className={cn(
            "rounded-3xl border border-white/10 bg-white/4 p-4",
            !questUnlocked && "opacity-60",
          )}
        >
          <p className="text-sm text-[var(--color-text-muted)]">Active quest arc</p>
          {questUnlocked && activeArc ? (
            <>
              <p className="mt-1 text-lg font-semibold text-white">{activeArc.title}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{activeArc.description}</p>
              <p className="mt-3 text-sm text-white">
                {Math.min(activeArc.progress, activeArc.target)}/{activeArc.target}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-400 to-amber-300 transition-all"
                  style={{
                    width: `${Math.min(100, (activeArc.progress / activeArc.target) * 100)}%`,
                  }}
                />
              </div>
              {activeArc.completed && !activeArc.claimed && settledActive?.id === activeArc.id && settledActive.completed ? (
                <button
                  type="button"
                  disabled={pendingClaimIds.includes(`quest:${activeArc.id}`)}
                  onClick={() => claimQuestArcReward(activeArc.id)}
                  className="mt-3 rounded-full border border-pink-300/20 bg-pink-300/10 px-4 py-2 text-sm text-pink-100 transition hover:bg-pink-300/16 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pendingClaimIds.includes(`quest:${activeArc.id}`)
                    ? "Saving…"
                    : "Claim chapter reward"}
                </button>
              ) : activeArc.completed && !activeArc.claimed ? (
                <p className="mt-3 text-xs text-amber-100/90">
                  Chapter complete in preview — claim unlocks after lock-in. {SETTLEMENT_LOCK_HINT}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-lg font-semibold text-white">
              {questUnlocked ? "All chapters claimed" : "Unlocks at level 3"}
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/4 p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Weekly recap</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[var(--color-text-muted)]">Clears</p>
              <p className="mt-1 text-lg font-semibold text-white">{recap.completions}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)]">EXP</p>
              <p className="mt-1 text-lg font-semibold text-white">{formatNumber(recap.exp)}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)]">Hard clears</p>
              <p className="mt-1 text-lg font-semibold text-white">{recap.hardClears}</p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)]">Boss damage</p>
              <p className="mt-1 text-lg font-semibold text-white">{recap.bossDamageDealt}</p>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
