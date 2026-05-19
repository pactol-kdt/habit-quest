"use client";

import { motion } from "framer-motion";
import { formatNumber } from "~/lib/habitquest/utils";

interface ExpProgressProps {
  level: number;
  currentExp: number;
  requiredExp: number;
  progressPercent: number;
}

export function ExpProgress({
  level,
  currentExp,
  requiredExp,
  progressPercent,
}: ExpProgressProps) {
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
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 shadow-[0_0_20px_rgba(77,216,255,0.35)]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(progressPercent, 6)}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>
    </div>
  );
}
