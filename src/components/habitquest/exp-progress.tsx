"use client";

import { motion } from "framer-motion";
import { formatNumber } from "~/lib/habitquest/utils";

interface ExpProgressProps {
  level: number;
  currentExp: number;
  requiredExp: number;
  progressPercent: number;
  compact?: boolean;
}

export function ExpProgress({
  level,
  currentExp,
  requiredExp,
  progressPercent,
  compact = false,
}: ExpProgressProps) {
  const barWidth = `${Math.max(progressPercent, 6)}%`;

  if (compact) {
    return (
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
          <span>Level {level}</span>
          <span>
            {formatNumber(currentExp)} / {formatNumber(requiredExp)} EXP
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/6 ring-1 ring-white/8">
          <motion.div
            className="hq-fill-accent h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: barWidth }}
            transition={{ type: "spring", stiffness: 120, damping: 24 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 text-sm text-[var(--color-text-muted)]">
        <span>Level {level} progress</span>
        <span>
          {formatNumber(currentExp)} / {formatNumber(requiredExp)} EXP
        </span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-white/6 ring-1 ring-white/8">
        <motion.div
          className="hq-fill-accent h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: barWidth }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>
    </div>
  );
}
