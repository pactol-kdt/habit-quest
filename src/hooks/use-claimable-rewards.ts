"use client";

import { useMemo } from "react";
import { listClaimableRewards } from "~/lib/habitquest/claimables";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function useClaimableRewards() {
  const store = useHabitQuestStore((state) => state);

  return useMemo(() => {
    if (!store.hydrated) {
      return [];
    }
    return listClaimableRewards(store.projectSave());
  }, [
    store.hydrated,
    store.version,
    store.challenges,
    store.questArcs,
    store.seasonPass,
    store.weeklyBoss,
    store.levelUnlocks,
    store.userProgress.level,
    store.projectSave,
  ]);
}
