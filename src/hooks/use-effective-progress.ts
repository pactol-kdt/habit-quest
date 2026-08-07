"use client";

import { useMemo } from "react";
import {
  getEffectiveQuestArcs,
  getEffectiveSeasonPass,
  getEffectiveUserProgress,
  getEffectiveWalletCoins,
  getEffectiveWeeklyBoss,
  getPendingComebackPreview,
  getPendingComboPreview,
  getPendingHabitExp,
  getPendingSeasonXp,
} from "~/lib/habitquest/day-settlement";
import { useHabitQuestStore } from "~/store/habitquest-store";

/** Preview settled + today's pending habit progress for UI. */
export function useEffectiveProgress() {
  const store = useHabitQuestStore((state) => state);

  return useMemo(() => {
    if (!store.hydrated) {
      return {
        userProgress: store.userProgress,
        seasonPass: store.seasonPass,
        walletCoins: store.wallet.totalCoins,
        weeklyBoss: {
          ...store.weeklyBoss,
          pendingDamage: 0,
          effectiveHp: store.weeklyBoss.currentHp,
        },
        questArcs: store.questArcs,
        pendingHabitExp: 0,
        pendingSeasonXp: 0,
        pendingCombo: { exp: 0, coins: 0 },
        pendingComeback: { exp: 0, coins: 0 },
      };
    }

    const data = store.projectSave();
    return {
      userProgress: getEffectiveUserProgress(data),
      seasonPass: getEffectiveSeasonPass(data),
      walletCoins: getEffectiveWalletCoins(data),
      weeklyBoss: getEffectiveWeeklyBoss(data),
      questArcs: getEffectiveQuestArcs(data),
      pendingHabitExp: getPendingHabitExp(data),
      pendingSeasonXp: getPendingSeasonXp(data),
      pendingCombo: getPendingComboPreview(data),
      pendingComeback: getPendingComebackPreview(data),
    };
  }, [
    store.hydrated,
    store.version,
    store.habits,
    store.completions,
    store.userProgress,
    store.seasonPass,
    store.wallet,
    store.weeklyBoss,
    store.questArcs,
    store.rewardSystems,
    store.projectSave,
  ]);
}
