"use client";

import Link from "next/link";
import { SeasonPassPage } from "~/components/habitquest/season-pass-page";
import { WeekPage } from "~/components/habitquest/week-page";
import { cn } from "~/lib/ui/cn";

export function RewardsPage({ tab }: { tab: "week" | "season" }) {
  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <div className="flex gap-2">
        <Link
          href="/week"
          className={cn(
            "rounded-full px-4 py-2 text-sm transition",
            tab === "week"
              ? "bg-white/10 text-white"
              : "text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white",
          )}
        >
          Week
        </Link>
        <Link
          href="/season"
          className={cn(
            "rounded-full px-4 py-2 text-sm transition",
            tab === "season"
              ? "bg-white/10 text-white"
              : "text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white",
          )}
        >
          Season
        </Link>
      </div>
      {tab === "week" ? <WeekPage /> : <SeasonPassPage />}
    </div>
  );
}
