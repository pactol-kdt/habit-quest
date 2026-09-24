"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { CurrencyAmount } from "~/components/habitquest/icons/currency-amount";
import { cn } from "~/lib/ui/cn";
import { useHabitQuestStore } from "~/store/habitquest-store";

const FLOAT_MS = 1400;

export function FloatingRewardLayer() {
  const floatingRewards = useHabitQuestStore((state) => state.floatingRewards);
  const dismissFloatingReward = useHabitQuestStore((state) => state.dismissFloatingReward);

  useEffect(() => {
    if (!floatingRewards.length) {
      return;
    }

    const timers = floatingRewards.map((reward) =>
      window.setTimeout(() => dismissFloatingReward(reward.id), FLOAT_MS),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissFloatingReward, floatingRewards]);

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 sm:bottom-auto sm:left-auto sm:right-8 sm:top-24 sm:translate-x-0 sm:items-end lg:top-28"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence>
        {floatingRewards.map((reward) => (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, y: 12, scale: 0.92 }}
            animate={{ opacity: [0, 1, 1, 0], y: -56, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FLOAT_MS / 1000, times: [0, 0.12, 0.75, 1], ease: "easeOut" }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums",
              reward.kind === "coins" ? "text-amber-100" : "text-cyan-100",
            )}
          >
            <CurrencyAmount
              kind={reward.kind === "coins" ? "coins" : "exp"}
              value={reward.value}
              prefix="+"
              size={16}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
