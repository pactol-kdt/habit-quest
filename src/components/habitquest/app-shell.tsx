"use client";

import { useHabitQuestHydration } from "~/hooks/use-habitquest-hydration";
import { FloatingRewardLayer } from "~/components/habitquest/floating-reward-layer";
import { Navigation } from "~/components/habitquest/navigation";
import { RewardToastLayer } from "~/components/habitquest/reward-toast-layer";

export function AppShell({ children }: { children: React.ReactNode }) {
  useHabitQuestHydration();

  return (
    <div className="relative min-h-screen">
      <Navigation />
      <RewardToastLayer />
      <FloatingRewardLayer />
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 md:px-6 md:pt-8">
        {children}
      </div>
    </div>
  );
}
