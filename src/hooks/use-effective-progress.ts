"use client";

import { useMemo } from "react";
import {
  getEffectiveQuestArcs,
  getEffectiveSeasonPass,
  getEffectiveUserProgress,
  getEffectiveWalletCoins,
  getPendingComebackPreview,
  getPendingComboPreview,
  getPendingHabitExp,
  getPendingSeasonXp,
} from "~/lib/habitquest/day-settlement";
import { useHabitQuestStore } from "~/store/habitquest-store";

/**
 * Settled level / EXP / coins for UI gates.
 * Pending habit EXP, combo, comeback, and season XP are included
 * once today's Done is applied. Undo today reverses them.
 */
export function useEffectiveProgress() {
  const store = useHabitQuestStore((state) => state);

  return useMemo(() => {
    if (!store.hydrated) {
      return {
        userProgress: store.userProgress,
        seasonPass: store.seasonPass,
        walletCoins: store.wallet.totalCoins,
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
    store.questArcs,
    store.rewardSystems,
    store.projectSave,
  ]);
}
