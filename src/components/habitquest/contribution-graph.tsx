"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatDateLabel,
  getContributionActivity,
  getContributionYears,
  getTodayDateKey,
  type ContributionLevel,
} from "~/lib/habitquest/utils";
import { cn } from "~/lib/ui/cn";
import type { HabitCompletion } from "~/types/habitquest";

const LEVEL_CLASS: Record<ContributionLevel, string> = {
  0: "bg-white/6 border-white/8",
  1: "bg-emerald-900/70 border-emerald-700/40",
  2: "bg-emerald-700/80 border-emerald-500/40",
  3: "bg-emerald-500/85 border-emerald-300/35",
  4: "bg-[var(--color-green)] border-emerald-100/40",
};

const WEEKDAY_MARKERS = [
  { index: 1, label: "Mon" },
  { index: 3, label: "Wed" },
  { index: 5, label: "Fri" },
] as const;

interface ContributionGraphProps {
  completions: HabitCompletion[];
  className?: string;
}

export function ContributionGraph({ completions, className }: ContributionGraphProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const today = getTodayDateKey();
  const years = useMemo(() => getContributionYears(completions, today), [completions, today]);
  const [selectedYear, setSelectedYear] = useState(years[0]!);
  const year = years.includes(selectedYear) ? selectedYear : years[0]!;
  const activity = useMemo(
    () => getContributionActivity(completions, year, today),
    [completions, year, today],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    scroller.scrollLeft = scroller.scrollWidth;
  }, [activity.year, activity.weeks.length]);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title text-2xl text-white">Activity</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {activity.totalCompletions === 0
              ? `No habit clears in ${year} yet.`
              : `${activity.totalCompletions} clear${activity.totalCompletions === 1 ? "" : "s"} across ${activity.totalActiveDays} day${activity.totalActiveDays === 1 ? "" : "s"} in ${year}.`}
          </p>
        </div>
        <label className="grid gap-1.5">
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Year
          </span>
          <select
            value={year}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
          >
            {years.map((entry) => (
              <option key={entry} value={entry} className="bg-slate-950 text-white">
                {entry}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-none mt-5 -mx-1 max-w-full overflow-x-auto overscroll-x-contain px-1 py-2 touch-pan-x"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="inline-flex min-w-max gap-1.5">
          <div className="sticky left-0 z-10 flex w-7 shrink-0 flex-col gap-[3px] bg-[var(--color-panel-strong)] pt-[18px] pr-1">
            {Array.from({ length: 7 }, (_, index) => {
              const marker = WEEKDAY_MARKERS.find((entry) => entry.index === index);
              return (
                <div
                  key={index}
                  className="flex h-[11px] items-center text-[10px] leading-none text-[var(--color-text-muted)]"
                >
                  {marker?.label ?? ""}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex gap-[3px]">
              {activity.weeks.map((week, weekIndex) => {
                const monthGap = Boolean(week.monthLabel) && weekIndex > 0;
                return (
                  <div
                    key={`month-${weekIndex}`}
                    className={cn("relative h-3.5 w-[11px]", monthGap && "ml-2")}
                  >
                    {week.monthLabel ? (
                      <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] leading-none text-[var(--color-text-muted)]">
                        {week.monthLabel}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-[3px]">
              {activity.weeks.map((week, weekIndex) => {
                const monthGap = Boolean(week.monthLabel) && weekIndex > 0;
                return (
                  <div
                    key={`week-${weekIndex}`}
                    className={cn("flex flex-col gap-[3px]", monthGap && "ml-2")}
                  >
                    {week.days.map((day) => {
                      const inYear = day.date.startsWith(`${year}-`);
                      const isFuture = day.date > today;
                      const hidden = !inYear || isFuture;
                      const title =
                        day.count === 0
                          ? `No clears on ${formatDateLabel(day.date)}`
                          : `${day.count} clear${day.count === 1 ? "" : "s"} on ${formatDateLabel(day.date)}`;

                      return (
                        <div
                          key={day.date}
                          title={hidden ? undefined : title}
                          aria-label={hidden ? undefined : title}
                          className={cn(
                            "h-[11px] w-[11px] rounded-[2px] border",
                            LEVEL_CLASS[day.level],
                            hidden && "invisible",
                          )}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-1.5 text-[11px] text-[var(--color-text-muted)]">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as ContributionLevel[]).map((level) => (
          <span
            key={level}
            className={cn("h-[11px] w-[11px] rounded-[2px] border", LEVEL_CLASS[level])}
            aria-hidden
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
