"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AvatarWithFrame } from "~/components/habitquest/cosmetic-art";
import { ContributionGraph } from "~/components/habitquest/contribution-graph";
import { GlassCard } from "~/components/habitquest/glass-card";
import { PetCard } from "~/components/habitquest/pet-card";
import { HonorMedal } from "~/components/habitquest/profile-page";
import { StreakFlame } from "~/components/habitquest/streak-flame";
import { getStreakFireTier } from "~/lib/habitquest/streak-fire-tier";
import { formatNumber, getProfileDisplay } from "~/lib/habitquest/utils";
import type { FriendProfileView } from "~/lib/v1/friend-rules";
import { getFriendProfileRequest } from "~/lib/v1/requests";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { HabitCompletion } from "~/types/habitquest";

export function FriendProfilePage({ userId }: { userId: string }) {
  const shopItems = useHabitQuestStore((state) => state.shopItems);
  const [profile, setProfile] = useState<FriendProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uidCopied, setUidCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getFriendProfileRequest(userId).then((result) => {
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (!result.ok) {
        setProfile(null);
        setError(result.error);
        return;
      }
      setProfile(result.profile);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="grid min-w-0 gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-48 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="grid min-w-0 gap-4 pt-4 md:gap-6 md:pt-6">
        <Link href="/friends" prefetch={false} className="text-sm text-cyan-100">
          Back to Friends
        </Link>
        <GlassCard className="rounded-[1.75rem] p-4">
          <p className="text-sm text-rose-100">{error ?? "Friend not found."}</p>
        </GlassCard>
      </div>
    );
  }

  const cosmetics = getProfileDisplay(shopItems, {
    titleItemId: profile.titleItemId,
    frameItemId: profile.frameItemId,
    avatarItemId: profile.avatarItemId,
    themeItemId: null,
  });
  const streakTier = getStreakFireTier(profile.currentStreak);
  const completions: HabitCompletion[] = profile.activityDates.map((date, index) => ({
    id: `${profile.userId}-${date}-${index}`,
    habitId: "",
    date,
    expEarned: 0,
    streakBonusExp: 0,
    completedAt: date,
  }));

  return (
    <div className="grid min-w-0 gap-4 pt-4 md:gap-6 md:pt-6">
      <Link href="/friends" prefetch={false} className="text-sm text-cyan-100">
        Back to Friends
      </Link>

      <GlassCard className="overflow-hidden rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">Friend</p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">{profile.displayName}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base">
          Activity, identity, and honors.
        </p>
      </GlassCard>

      <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <AvatarWithFrame
            avatar={cosmetics.avatar}
            frame={cosmetics.frame}
            className="h-24 w-24 shrink-0 border border-white/10 shadow-[0_0_36px_rgba(77,216,255,0.16)] sm:h-28 sm:w-28"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-2xl font-semibold text-white sm:text-3xl">{profile.displayName}</p>
            <p className="mt-1 text-sm font-medium text-white/90">{cosmetics.title?.name ?? "Unranked"}</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Level {profile.level} · {formatNumber(profile.totalExp)} EXP
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <p className="font-mono text-sm tracking-[0.14em] text-cyan-100">UID {profile.uid}</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(profile.uid);
                    setUidCopied(true);
                    window.setTimeout(() => setUidCopied(false), 1500);
                  } catch {
                    setUidCopied(false);
                  }
                }}
                title={uidCopied ? "Copied" : "Copy"}
                aria-label={uidCopied ? "Copied" : "Copy UID"}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
              >
                {uidCopied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <StreakFlame tier={streakTier} size="xs" />
              {profile.currentStreak === 1 ? "1-day streak" : `${profile.currentStreak}-day streak`}
            </div>
          </div>
        </div>
      </GlassCard>

      <PetCard completions={profile.completionCount} />

      <GlassCard className="min-w-0 overflow-hidden">
        <ContributionGraph completions={completions} />
      </GlassCard>

      <HonorMedal tone="gold" count={profile.seasonPassCompletions} label="Seasons finished" />
    </div>
  );
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15V5h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="m6 12 4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
