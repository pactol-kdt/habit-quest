"use client";

import { useEffect } from "react";
import { GlassCard } from "~/components/habitquest/glass-card";
import {
  CHANGELOG,
  getLatestChangelogEntry,
  markChangelogSeen,
} from "~/lib/habitquest/changelog";

export function ChangelogPage() {
  useEffect(() => {
    const latest = getLatestChangelogEntry();
    if (latest) {
      markChangelogSeen(latest.version);
    }
  }, []);

  return (
    <div className="grid min-w-0 gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          You
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
          What&apos;s new
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
          A short note when HabitQuest changes. Your habits stay the same.
        </p>
      </GlassCard>

      <div className="grid min-w-0 gap-4">
        {CHANGELOG.map((entry, index) => (
          <GlassCard key={entry.version} className="min-w-0 rounded-[1.75rem]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-sm text-[var(--color-text-muted)]">Version {entry.version}</p>
              {entry.date ? (
                <p className="text-sm text-[var(--color-text-muted)]">{entry.date}</p>
              ) : null}
              {index === 0 ? (
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-100">
                  Latest
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">{entry.title}</h2>
            <ul className="mt-4 grid gap-3">
              {entry.changes.map((change) => (
                <li
                  key={change}
                  className="flex min-w-0 gap-3 text-sm leading-6 text-[var(--color-text-muted)]"
                >
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200/80" />
                  <span className="min-w-0 break-words">{change}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
