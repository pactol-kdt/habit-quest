"use client";

import { useEffect } from "react";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function useHabitQuestHydration() {
  const hydrate = useHabitQuestStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);
}
