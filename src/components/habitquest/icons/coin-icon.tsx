"use client";

import { useId } from "react";
import { cn } from "~/lib/ui/cn";

interface CoinIconProps {
  size?: number;
  className?: string;
  title?: string;
}

/** HabitQuest mint — layered gold coin with beveled rim and rising check. */
export function CoinIcon({ size = 16, className, title }: CoinIconProps) {
  const uid = useId().replace(/:/g, "");
  const rimId = `hq-coin-rim-${uid}`;
  const faceId = `hq-coin-face-${uid}`;
  const bevelId = `hq-coin-bevel-${uid}`;
  const glossId = `hq-coin-gloss-${uid}`;
  const coreId = `hq-coin-core-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={rimId} x1="6" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff6d4" />
          <stop offset="35%" stopColor="#f0c45a" />
          <stop offset="70%" stopColor="#c88820" />
          <stop offset="100%" stopColor="#8a5a12" />
        </linearGradient>
        <radialGradient id={faceId} cx="12" cy="11" r="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="55%" stopColor="var(--color-gold)" />
          <stop offset="100%" stopColor="#b8741c" />
        </radialGradient>
        <linearGradient id={bevelId} x1="16" y1="5" x2="16" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff3c8" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#e0a83a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6e4510" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={glossId} x1="8" y1="6" x2="20" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={coreId} x1="16" y1="10" x2="16" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff8de" />
          <stop offset="100%" stopColor="#d4a03a" />
        </linearGradient>
      </defs>

      {/* Drop shadow disc */}
      <circle cx="16.5" cy="17" r="13.2" fill="#5a3a0e" opacity="0.28" />

      {/* Outer rim */}
      <circle cx="16" cy="16" r="13.2" fill={`url(#${rimId})`} />

      {/* Bevel ring */}
      <circle cx="16" cy="16" r="11.4" fill={`url(#${bevelId})`} />

      {/* Face */}
      <circle cx="16" cy="16" r="10.2" fill={`url(#${faceId})`} />

      {/* Inner minted ring */}
      <circle
        cx="16"
        cy="16"
        r="8.35"
        stroke="#8a5a14"
        strokeWidth="1.15"
        opacity="0.45"
      />
      <circle
        cx="16"
        cy="16"
        r="8.35"
        stroke="#fff2c2"
        strokeWidth="0.7"
        opacity="0.7"
      />

      {/* Specular arc */}
      <path
        d="M8.2 11.2c1.8-3.2 5.2-5.1 8.8-4.6"
        stroke={`url(#${glossId})`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Rising check — HabitQuest mark */}
      <path
        d="M10.6 16.4 14.1 19.8 21.6 11.6"
        stroke="#6a4210"
        strokeWidth="2.55"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
      <path
        d="M10.6 16.4 14.1 19.8 21.6 11.6"
        stroke={`url(#${coreId})`}
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Tiny mint sparkles */}
      <circle cx="22.8" cy="9.2" r="1.05" fill="#fff8de" opacity="0.9" />
      <circle cx="9.4" cy="22.2" r="0.75" fill="#fff1c0" opacity="0.55" />
    </svg>
  );
}
