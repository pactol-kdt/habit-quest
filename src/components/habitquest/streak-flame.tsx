"use client";

import { cn } from "~/lib/ui/cn";
import type { StreakFireTier } from "~/lib/habitquest/streak-fire-tier";
import { streakFlameClass } from "~/lib/habitquest/streak-fire-tier";

interface StreakFlameProps {
  tier: StreakFireTier;
  size?: "sm" | "lg";
  className?: string;
}

export function StreakFlame({ tier, size = "lg", className }: StreakFlameProps) {
  const isLarge = size === "lg";

  return (
    <div
      aria-hidden
      className={cn(
        streakFlameClass(tier),
        isLarge ? "hq-streak-flame-lg" : "hq-streak-flame-sm",
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
          <linearGradient id="streak-flame-outer" x1="32" y1="8" x2="32" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="45%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="streak-flame-inner" x1="32" y1="24" x2="32" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="55%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <filter id="streak-flame-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M32 4C24 18 14 24 14 38c0 12 8 22 18 26 10-4 18-14 18-26 0-14-10-20-18-34Z"
          fill="url(#streak-flame-outer)"
          filter="url(#streak-flame-glow)"
        />
        <path
          d="M32 22c-6 8-10 13-10 20 0 7 4.5 12.5 10 15 5.5-2.5 10-8 10-15 0-7-4-12-10-20Z"
          fill="url(#streak-flame-inner)"
        />
        <ellipse cx="32" cy="52" rx="6" ry="8" fill="#fffbeb" opacity="0.85" />
      </svg>
    </div>
  );
}
