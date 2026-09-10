"use client";

import { useId } from "react";
import { cn } from "~/lib/ui/cn";

interface ExpIconProps {
  size?: number;
  className?: string;
  title?: string;
}

/** HabitQuest ascend orb — cyan energy core with rising flare and facets. */
export function ExpIcon({ size = 16, className, title }: ExpIconProps) {
  const uid = useId().replace(/:/g, "");
  const haloId = `hq-exp-halo-${uid}`;
  const shellId = `hq-exp-shell-${uid}`;
  const coreId = `hq-exp-core-${uid}`;
  const flareId = `hq-exp-flare-${uid}`;
  const facetId = `hq-exp-facet-${uid}`;

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
        <radialGradient id={haloId} cx="16" cy="16" r="15" gradientUnits="userSpaceOnUse">
          <stop offset="40%" stopColor="#4dd8ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#4dd8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={shellId} x1="8" y1="5" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d9f9ff" />
          <stop offset="40%" stopColor="#5adfff" />
          <stop offset="100%" stopColor="#1786ad" />
        </linearGradient>
        <radialGradient id={coreId} cx="13" cy="12" r="11" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f2fdff" />
          <stop offset="45%" stopColor="var(--color-cyan)" />
          <stop offset="100%" stopColor="#0f6f92" />
        </radialGradient>
        <linearGradient id={flareId} x1="16" y1="4" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#9aeeff" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id={facetId} x1="10" y1="10" x2="22" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Soft aura */}
      <circle cx="16" cy="16" r="14.5" fill={`url(#${haloId})`} />

      {/* Outer energy ring */}
      <circle cx="16" cy="16.4" r="11.6" fill="#0a4a62" opacity="0.35" />
      <circle cx="16" cy="16" r="11.4" fill={`url(#${shellId})`} />

      {/* Inner core */}
      <circle cx="16" cy="16" r="9.1" fill={`url(#${coreId})`} />

      {/* Facet cut lines */}
      <path
        d="M16 7.4 22.6 16 16 24.6 9.4 16 16 7.4Z"
        fill={`url(#${facetId})`}
        opacity="0.55"
      />
      <path
        d="M16 7.4 22.6 16 16 24.6 9.4 16 16 7.4Z"
        stroke="#e8fbff"
        strokeWidth="0.85"
        opacity="0.55"
      />

      {/* Rising flare / chevron stack */}
      <path
        d="M11.2 18.8 16 14.6l4.8 4.2"
        stroke="#063548"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
      />
      <path
        d="M11.2 18.8 16 14.6l4.8 4.2"
        stroke={`url(#${flareId})`}
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.4 15.2 16 12l3.6 3.2"
        stroke="#f5feff"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <path
        d="M13.6 11.8 16 9.6l2.4 2.2"
        stroke="#ffffff"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />

      {/* Spark tips */}
      <circle cx="16" cy="7.2" r="1.15" fill="#ffffff" />
      <circle cx="23.6" cy="11.4" r="0.85" fill="#d7f8ff" opacity="0.85" />
      <circle cx="8.6" cy="20.8" r="0.7" fill="#9aeeff" opacity="0.65" />
    </svg>
  );
}
