"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AvatarWithFrame } from "~/components/habitquest/cosmetic-art";
import { ContributionGraph } from "~/components/habitquest/contribution-graph";
import { GlassCard } from "~/components/habitquest/glass-card";
import { StreakFlame } from "~/components/habitquest/streak-flame";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import { PAGE_HEROES } from "~/lib/habitquest/copy";
import { formatUid } from "~/lib/v1/friend-rules";
import { formatNumber, getProfileDisplay } from "~/lib/habitquest/utils";
import { getStreakFireTier } from "~/lib/habitquest/streak-fire-tier";
import { cn } from "~/lib/ui/cn";
import { changePasswordRequest, signOutRequest } from "~/lib/v1/requests";
import {
  setCloudSyncEnabled,
} from "~/lib/habitquest/cloud-sync";
import { clearHabitQuestData, invalidateClientSession } from "~/lib/habitquest/storage";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function ProfilePage() {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signOutPending, setSignOutPending] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [uidCopied, setUidCopied] = useState(false);
  const {
    hydrated,
    settings,
    updateSettings,
    shopItems,
    equippedItems,
    rewardSystems,
    completions,
    authUser,
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

  async function onSignOut() {
    if (signOutPending) {
      return;
    }
    setSignOutPending(true);
    setSignOutError(null);
    invalidateClientSession();
    try {
      const result = await signOutRequest();
      if (!result.ok) {
        setSignOutError(result.error);
        setSignOutPending(false);
        return;
      }
      setCloudSyncEnabled(false);
      clearHabitQuestData();
      window.location.replace("/");
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Could not log out.");
      setSignOutPending(false);
    }
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
          <div className="relative shrink-0">
            <AvatarWithFrame
              avatar={profile.avatar}
              frame={profile.frame}
              className="h-24 w-24 border border-white/10 shadow-[0_0_36px_rgba(77,216,255,0.16)] sm:h-28 sm:w-28"
            />
            <Link
              href="/inventory"
              aria-label="Inventory"
              title="Inventory"
              className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/40 bg-[#041018] text-cyan-100 shadow-[0_8px_20px_rgba(4,16,24,0.55)] transition hover:border-cyan-200 hover:text-white"
            >
              <GearIcon />
            </Link>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-2xl font-semibold text-white sm:text-3xl">{displayName}</p>
            <p className="mt-1 text-sm font-medium text-white/90">
              {profile.title?.name ?? "Unranked"}
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Level {userProgress.level}
              {authUser ? ` · ${authUser.email}` : " · Playing as guest"}
            </p>
            {authUser?.uid ? (
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <p className="font-mono text-sm tracking-[0.14em] text-cyan-100">
                  UID {formatUid(authUser.uid)}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(formatUid(authUser.uid));
                      setUidCopied(true);
                      window.setTimeout(() => setUidCopied(false), 1500);
                    } catch {
                      setUidCopied(false);
                    }
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
                >
                  {uidCopied ? "Copied" : "Copy"}
                </button>
              </div>
            ) : null}
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
          {authUser ? (
            <>
              <button
                type="button"
                onClick={() => setPasswordOpen(true)}
                className="rounded-full hq-btn-accent px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Change password
              </button>
              <button
                type="button"
                disabled={signOutPending}
                onClick={onSignOut}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-rose-300/40 hover:text-rose-100 disabled:opacity-60"
              >
                {signOutPending ? "Logging out…" : "Log out"}
              </button>
              {signOutError ? (
                <p className="w-full text-sm text-rose-200">{signOutError}</p>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              onClick={() => exitGuestPlay("keep")}
              className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/50"
            >
              Create account to keep progress
            </button>
          )}
        </div>
      </GlassCard>

      <GlassCard className="min-w-0 overflow-hidden">
        <ContributionGraph completions={completions} />
      </GlassCard>

      <HonorMedal
        tone="gold"
        count={rewardSystems.seasonPassCompletions ?? 0}
        label="Seasons finished"
      />

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

function HonorMedal({
  tone,
  count,
  label,
}: {
  tone: "gold" | "ember";
  count: number;
  label: string;
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

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.22-1.13.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.41 1.05.72 1.63.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.58-.22 1.13-.53 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
      />
    </svg>
  );
}
