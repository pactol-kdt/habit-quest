"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { cn } from "~/lib/ui/cn";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function FloatingRewardLayer() {
  const floatingRewards = useHabitQuestStore((state) => state.floatingRewards);
  const dismissFloatingReward = useHabitQuestStore((state) => state.dismissFloatingReward);

  useEffect(() => {
    if (!floatingRewards.length) {
      return;
    }

    const timers = floatingRewards.map((reward) =>
      window.setTimeout(() => dismissFloatingReward(reward.id), 1800),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissFloatingReward, floatingRewards]);

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-3 z-50 flex flex-col items-start gap-3 sm:bottom-8 sm:left-auto sm:right-8 sm:items-end lg:bottom-8">
      <AnimatePresence>
        {floatingRewards.map((reward) => (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: -12, scale: 1 }}
            exit={{ opacity: 0, y: -28, scale: 0.86 }}
            transition={{ duration: 0.6 }}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold shadow-[0_18px_50px_rgba(0,0,0,0.35)]",
              reward.kind === "coins"
                ? "bg-amber-300/18 text-amber-100 ring-1 ring-amber-300/20"
                : "bg-cyan-300/18 text-cyan-100 ring-1 ring-cyan-300/20",
            )}
          >
            +{reward.value} {reward.kind === "coins" ? "coins" : "EXP"} • {reward.label}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
