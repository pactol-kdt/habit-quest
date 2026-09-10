"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AvatarWithFrame } from "~/components/habitquest/cosmetic-art";
import { ContributionGraph } from "~/components/habitquest/contribution-graph";
import { GlassCard } from "~/components/habitquest/glass-card";
import { StreakFlame } from "~/components/habitquest/streak-flame";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import { PAGE_HEROES } from "~/lib/habitquest/copy";
import { formatNumber, getProfileDisplay } from "~/lib/habitquest/utils";
import { getStreakFireTier } from "~/lib/habitquest/streak-fire-tier";
import { cn } from "~/lib/ui/cn";
import { changePasswordRequest, signOutRequest } from "~/lib/v1/requests";
import {
  flushCloudSaveNow,
  setCloudSyncEnabled,
} from "~/lib/habitquest/cloud-sync";
import { clearHabitQuestData } from "~/lib/habitquest/storage";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function ProfilePage() {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signOutPending, startSignOut] = useTransition();
  const {
    hydrated,
    settings,
    updateSettings,
    shopItems,
    equippedItems,
    rewardSystems,
    completions,
    authUser,
    setAuthUser,
    setAuthChecked,
    projectSave,
    exitGuestPlay,
  } = useHabitQuestStore((state) => state);
  const { userProgress } = useEffectiveProgress();
  const [displayNameDraft, setDisplayNameDraft] = useState(settings.displayName);
  const hero = PAGE_HEROES.profile;
  const profile = getProfileDisplay(shopItems, equippedItems);
  const displayName = settings.displayName.trim() || "Adventurer";
  const streakTier = getStreakFireTier(userProgress.currentStreak);

  useEffect(() => {
    setDisplayNameDraft(settings.displayName);
  }, [settings.displayName]);

  if (!hydrated) {
    return (
      <div className="grid min-w-0 gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-48 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  function commitDisplayName() {
    const next = displayNameDraft.trim().slice(0, 32);
    setDisplayNameDraft(next);
    if (next === settings.displayName) {
      return;
    }
    updateSettings({ displayName: next });
  }

  function onSignOut() {
    startSignOut(async () => {
      await flushCloudSaveNow(projectSave());
      await signOutRequest();
      setCloudSyncEnabled(false);
      clearHabitQuestData();
      setAuthUser(null);
      setAuthChecked(true);
    });
  }

  return (
    <div className="grid min-w-0 gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="overflow-hidden rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          {hero.eyebrow}
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
          {hero.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base">
          {hero.support}
        </p>
      </GlassCard>

      <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <AvatarWithFrame
            avatar={profile.avatar}
            frame={profile.frame}
            className="h-24 w-24 border border-white/10 shadow-[0_0_36px_rgba(77,216,255,0.16)] sm:h-28 sm:w-28"
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-2xl font-semibold text-white sm:text-3xl">{displayName}</p>
            <p className="mt-1 text-sm font-medium text-white/90">
              {profile.title?.name ?? "Unranked"}
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Level {userProgress.level}
              {authUser ? ` · ${authUser.email}` : " · Playing as guest"}
            </p>
            <div className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <StreakFlame tier={streakTier} size="xs" />
              {userProgress.currentStreak === 1
                ? "1-day streak"
                : `${userProgress.currentStreak}-day streak`}
            </div>
          </div>
        </div>

        <label className="mt-6 grid gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Display name</span>
          <input
            value={displayNameDraft}
            onChange={(event) => setDisplayNameDraft(event.target.value.slice(0, 32))}
            onBlur={commitDisplayName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
            maxLength={32}
            placeholder="Adventurer"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/shop"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            Change cosmetics
          </Link>
          {authUser ? (
            <button
              type="button"
              onClick={() => setPasswordOpen(true)}
              className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Change password
            </button>
          ) : (
            <button
              type="button"
              onClick={() => exitGuestPlay()}
              className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/50"
            >
              Save progress
            </button>
          )}
        </div>
      </GlassCard>

      <GlassCard className="min-w-0 overflow-hidden">
        <ContributionGraph completions={completions} />
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <HonorMedal
          tone="gold"
          count={rewardSystems.seasonPassCompletions ?? 0}
          label="Seasons cleared"
          hint="Season finales claimed"
        />
        <HonorMedal
          tone="ember"
          count={rewardSystems.weeklyBossCompletions ?? 0}
          label="Bosses felled"
          hint="Weekly raids dropped"
        />
      </div>

      {authUser ? (
        <GlassCard>
          <h2 className="section-title text-2xl text-white">Account</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Signed in as {authUser.email}.
          </p>
          <button
            type="button"
            disabled={signOutPending}
            onClick={onSignOut}
            className="mt-5 rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white disabled:opacity-60"
          >
            {signOutPending ? "Signing out…" : "Sign out"}
          </button>
        </GlassCard>
      ) : null}

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

function HonorMedal({
  tone,
  count,
  label,
  hint,
}: {
  tone: "gold" | "ember";
  count: number;
  label: string;
  hint: string;
}) {
  const gold = tone === "gold";
  return (
    <GlassCard
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] p-5 md:p-6",
        gold
          ? "border-amber-300/25"
          : "border-rose-300/20",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full blur-2xl",
          gold ? "bg-amber-300/16" : "bg-rose-400/16",
        )}
      />
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "grid h-20 w-20 shrink-0 place-items-center rounded-full border shadow-[inset_0_0_24px_rgba(255,255,255,0.08)]",
            gold
              ? "border-amber-200/40 bg-gradient-to-br from-amber-200/25 via-amber-500/10 to-transparent"
              : "border-rose-200/35 bg-gradient-to-br from-rose-200/20 via-orange-500/10 to-transparent",
          )}
        >
          <span
            className={cn(
              "text-3xl font-semibold tabular-nums",
              gold ? "text-amber-100" : "text-rose-100",
            )}
          >
            {formatNumber(count)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Lifetime
          </p>
          <p className="mt-1 text-lg font-semibold text-white">{label}</p>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{hint}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function ChangePasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open ? <ChangePasswordPanel onClose={onClose} /> : null}
    </AnimatePresence>,
    document.body,
  );
}

function ChangePasswordPanel({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLFormElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useDialogA11y(panelRef, onClose);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (nextPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await changePasswordRequest(currentPassword, nextPassword);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        tabIndex={-1}
        onSubmit={onSubmit}
        className="glass-panel w-full max-w-md rounded-t-[1.5rem] border border-white/10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none sm:rounded-[1.75rem] sm:p-6"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="change-password-title" className="section-title text-2xl text-white">
          Change password
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Enter your current password, then choose a new one.
        </p>
        <label className="mt-5 grid gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
          />
        </label>
        <label className="mt-4 grid gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
          />
        </label>
        <label className="mt-4 grid gap-2">
          <span className="text-sm text-[var(--color-text-muted)]">Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Update password"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
