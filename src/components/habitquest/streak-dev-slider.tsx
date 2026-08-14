"use client";

const isDev = process.env.NODE_ENV === "development";

const PRESET_STREAKS = [0, 1, 3, 7, 14, 30];

interface StreakDevSliderProps {
  liveStreak: number;
  previewStreak: number | null;
  onPreviewChange: (value: number | null) => void;
}

export function StreakDevSlider({
  liveStreak,
  previewStreak,
  onPreviewChange,
}: StreakDevSliderProps) {
  if (!isDev) {
    return null;
  }

  const activeStreak = previewStreak ?? liveStreak;
  const usingPreview = previewStreak != null;

  return (
    <div className="mt-3 rounded-2xl border border-dashed border-amber-300/35 bg-amber-300/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200/90">
          Dev · streak preview
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {usingPreview ? `Preview ${activeStreak}d` : `Live ${liveStreak}d`}
        </p>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={activeStreak}
        onChange={(event) => onPreviewChange(Number(event.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-300"
        aria-label="Preview streak days"
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESET_STREAKS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => onPreviewChange(days)}
            className={
              activeStreak === days && usingPreview
                ? "rounded-full border border-amber-300/50 bg-amber-300/15 px-2.5 py-1 text-xs text-amber-100"
                : "rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
            }
          >
            {days}d
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPreviewChange(null)}
          className={
            !usingPreview
              ? "rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-xs text-cyan-100"
              : "rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          }
        >
          Live ({liveStreak}d)
        </button>
      </div>
    </div>
  );
}
