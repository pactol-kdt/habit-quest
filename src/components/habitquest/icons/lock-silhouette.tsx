import { cn } from "~/lib/ui/cn";

interface LockSilhouetteProps {
  size?: number;
  className?: string;
}

/** Wordless lock mark for muted / unavailable achievement states. */
export function LockSilhouette({ size = 16, className }: LockSilhouetteProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-white/55", className)}
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" opacity="0.9" />
      <path
        d="M8 11V8.5a4 4 0 0 1 8 0V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.5" r="1.4" fill="rgba(7,17,31,0.75)" />
    </svg>
  );
}
