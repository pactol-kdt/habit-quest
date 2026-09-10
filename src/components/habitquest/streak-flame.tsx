"use client";

import { useId } from "react";
import { cn } from "~/lib/ui/cn";
import type { StreakFireTier } from "~/lib/habitquest/streak-fire-tier";
import { streakFlameClass } from "~/lib/habitquest/streak-fire-tier";

interface StreakFlameProps {
  tier: StreakFireTier;
  size?: "xs" | "sm" | "lg";
  className?: string;
}

const FLAME_SIZE_CLASS = {
  xs: "hq-streak-flame-xs",
  sm: "hq-streak-flame-sm",
  lg: "hq-streak-flame-lg",
} as const;

export function StreakFlame({ tier, size = "lg", className }: StreakFlameProps) {
  const uid = useId().replace(/:/g, "");
  const outerId = `streak-flame-outer-${uid}`;
  const innerId = `streak-flame-inner-${uid}`;
  const glowId = `streak-flame-glow-${uid}`;

  return (
    <div
      aria-hidden
      className={cn(
        streakFlameClass(tier),
        FLAME_SIZE_CLASS[size],
        className,
      )}
    >
      <div className="hq-streak-flame-aura" />
      <div className="hq-streak-flame-sparks">
        <span />
        <span />
        <span />
      </div>
      <svg
        viewBox="0 0 64 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="hq-streak-flame-svg"
        aria-hidden
      >
        <defs>
          <linearGradient id={outerId} x1="32" y1="8" x2="32" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--hq-flame-outer-0)" />
            <stop offset="45%" stopColor="var(--hq-flame-outer-1)" />
            <stop offset="100%" stopColor="var(--hq-flame-outer-2)" />
          </linearGradient>
          <linearGradient id={innerId} x1="32" y1="24" x2="32" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--hq-flame-inner-0)" />
            <stop offset="55%" stopColor="var(--hq-flame-inner-1)" />
            <stop offset="100%" stopColor="var(--hq-flame-inner-2)" />
          </linearGradient>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M32 4C24 18 14 24 14 38c0 12 8 22 18 26 10-4 18-14 18-26 0-14-10-20-18-34Z"
          fill={`url(#${outerId})`}
          filter={`url(#${glowId})`}
        />
        <path
          d="M32 22c-6 8-10 13-10 20 0 7 4.5 12.5 10 15 5.5-2.5 10-8 10-15 0-7-4-12-10-20Z"
          fill={`url(#${innerId})`}
        />
        <ellipse cx="32" cy="52" rx="6" ry="8" fill="var(--hq-flame-core)" opacity="0.85" />
      </svg>
    </div>
  );
}
