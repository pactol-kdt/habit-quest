"use client";

import { useMemo, useState, useTransition } from "react";
import type { AuthUser } from "~/lib/auth/session-types";
import { PASSWORD_RESET_ENABLED } from "~/lib/auth/password-reset-enabled";
import {
  forgotPasswordRequest,
  signInRequest,
  signOutRequest,
  signUpRequest,
  syncHabitQuestOnAuthRequest,
} from "~/lib/v1/requests";

type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: string };
import { GlassCard } from "~/components/habitquest/glass-card";
import { setCloudSyncEnabled } from "~/lib/habitquest/cloud-sync";
import { createSeedData } from "~/lib/habitquest/seed";
import {
  discardLocalGameSave,
  hasExtractableLocalProgress,
  peekHabitQuestLocalSave,
} from "~/lib/habitquest/storage";
import { useHabitQuestStore } from "~/store/habitquest-store";

type Mode = "signin" | "signup" | "forgot";
type Step = "choose" | "warn" | "form";

export function AuthGate() {
  const localSave = useMemo(() => peekHabitQuestLocalSave(), []);
  const canExtract = hasExtractableLocalProgress(localSave);
  const streak = localSave?.userProgress.currentStreak ?? 0;
  const [step, setStep] = useState<Step>("form");
  const [mode, setMode] = useState<Mode>(() =>
    useHabitQuestStore.getState().accountIntent === "keep" ? "signup" : "signin",
  );
  const [confirmedUser, setConfirmedUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const setAuthUser = useHabitQuestStore((state) => state.setAuthUser);
  const applyAuthenticatedSave = useHabitQuestStore((state) => state.applyAuthenticatedSave);
  const startGuestPlay = useHabitQuestStore((state) => state.startGuestPlay);

  function finishAuth(
    result: AuthResult,
    options: { extractLocal?: boolean; discardGuest?: boolean },
  ) {
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    setAuthUser(result.user);

    if (options.discardGuest) {
      discardLocalGameSave();
    }

    startTransition(async () => {
      const sync = await syncHabitQuestOnAuthRequest(
        options.discardGuest ? createSeedData() : (localSave ?? createSeedData()),
        options,
      );

      if (sync.status !== "loaded") {
        setError(sync.status === "error" ? sync.error : "Could not load your save.");
        setCloudSyncEnabled(false);
        setAuthUser(null);
        return;
      }

      setCloudSyncEnabled(true);
      applyAuthenticatedSave(sync.data, {
        processDailyLogin: true,
      });
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      if (mode === "forgot") {
        const result = await forgotPasswordRequest(email);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setNotice(result.message);
        return;
      }

      if (mode === "signup") {
        const displayName =
          localSave?.settings.displayName || email.split("@")[0] || "";
        const created = await signUpRequest(email, password, displayName);
        if (created.ok) {
          finishAuth(created, { extractLocal: canExtract });
          return;
        }
        if (created.error !== "An account with that email already exists.") {
          setError(created.error);
          return;
        }
        const signedIn = await signInRequest(email, password);
        if (!signedIn.ok) {
          setError(signedIn.error);
          return;
        }
        if (!canExtract) {
          finishAuth(signedIn, { discardGuest: true });
          return;
        }
        setConfirmedUser(signedIn.user);
        setStep("choose");
        return;
      }

      const result = await signInRequest(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!canExtract) {
        finishAuth(result, { discardGuest: true });
        return;
      }
      setConfirmedUser(result.user);
      setStep("choose");
    } finally {
      setSubmitting(false);
    }
  }

  const guestLine =
    streak > 0
      ? `This device has a ${streak}-day guest streak.`
      : "This device has a guest run.";

  const heading =
    step === "choose"
      ? "Keep this progress?"
      : step === "warn"
        ? "This account replaces the guest run"
        : mode === "signup"
          ? "Create your account"
          : mode === "forgot"
            ? "Reset your password"
            : "Welcome back";

  const support =
    step === "choose"
      ? `This email already has an account. ${guestLine} Create an account to keep it, or switch to that account.`
      : step === "warn"
        ? `${guestLine} Signing in drops that guest run and loads the account, even when the account has no habits yet.`
        : mode === "forgot"
          ? "We'll email a reset link if this address has an account. The link expires in one hour."
          : mode === "signup" && canExtract
            ? "The streak, habits, coins, and cosmetics on this device move onto the new account."
            : mode === "signin" && canExtract
              ? "The guest run on this device will be dropped."
              : "Your habits travel with your account — pick up on any device.";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-3 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(251,191,36,0.12),_transparent_40%)]" />
      <GlassCard className="relative z-10 w-full max-w-md rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-6 md:p-8">
        <div className="flex items-center gap-3">
          <img
            src="/brand/habitquest-logo.png"
            alt=""
            className="h-12 w-12 rounded-xl border border-white/10 object-cover"
          />
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
            HabitQuest
          </p>
        </div>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-3xl md:text-4xl">
          {heading}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{support}</p>

        {step === "choose" ? (
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => {
                void signOutRequest();
                setConfirmedUser(null);
                setMode("signup");
                setStep("form");
                setError(null);
                setNotice(null);
              }}
              className="min-h-12 rounded-full hq-btn-accent px-4 py-3 text-sm font-semibold text-slate-950"
            >
              Keep this progress
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("warn");
                setError(null);
                setNotice(null);
              }}
              className="min-h-11 rounded-full border border-white/10 px-4 py-2.5 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
            >
              Use an existing account
            </button>
          </div>
        ) : null}

        {step === "warn" ? (
          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => {
                if (!confirmedUser) {
                  return;
                }
                finishAuth({ ok: true, user: confirmedUser }, { discardGuest: true });
              }}
              className="min-h-12 rounded-full border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50"
            >
              Sign in and drop this progress
            </button>
            <button
              type="button"
              onClick={() => {
                void signOutRequest();
                setConfirmedUser(null);
                setMode("signup");
                setStep("form");
                setError(null);
                setNotice(null);
              }}
              className="min-h-11 rounded-full hq-btn-accent px-4 py-2.5 text-sm font-semibold text-slate-950"
            >
              Create account
            </button>
          </div>
        ) : null}

        {step === "form" ? (
        <form onSubmit={onSubmit} className="mt-5 grid gap-3">
          {mode !== "forgot" && !canExtract ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setNotice(null);
                }}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  mode === "signin" ? "bg-white/10 text-white" : "text-[var(--color-text-muted)]"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setNotice(null);
                }}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  mode === "signup" ? "bg-white/10 text-white" : "text-[var(--color-text-muted)]"
                }`}
              >
                Create account
              </button>
            </div>
          ) : null}
          <label className="grid gap-2">
            <span className="text-sm text-[var(--color-text-muted)]">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
            />
          </label>
          {mode !== "forgot" ? (
            <label className="grid gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">Password</span>
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
              />
            </label>
          ) : null}
          {PASSWORD_RESET_ENABLED && mode === "signin" ? (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setNotice(null);
              }}
              className="justify-self-start text-sm text-cyan-200 underline-offset-2 hover:underline"
            >
              Forgot password?
            </button>
          ) : null}
          <button
            type="submit"
            disabled={pending || submitting}
            className="min-h-12 rounded-full hq-btn-accent px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {pending || submitting
              ? mode === "signup"
                ? "Creating account…"
                : mode === "forgot"
                  ? "Sending link…"
                  : "Signing in…"
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
          </button>
        </form>
        ) : null}

        {step === "form" && mode === "forgot" ? (
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setNotice(null);
            }}
            className="mt-4 text-sm text-cyan-200 underline-offset-2 hover:underline"
          >
            Back to sign in
          </button>
        ) : null}

        {step === "warn" ? (
          <button
            type="button"
            onClick={() => {
              setStep("choose");
              setError(null);
            }}
            className="mt-4 text-sm text-cyan-200 underline-offset-2 hover:underline"
          >
            Back
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            if (confirmedUser) {
              void signOutRequest();
              setConfirmedUser(null);
            }
            startGuestPlay();
          }}
          className="mt-4 min-h-11 w-full rounded-full border border-white/10 px-4 py-2.5 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
        >
          {canExtract ? "Continue on this device" : "Try without an account"}
        </button>

        {notice ? <p className="mt-3 text-sm text-cyan-100">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
      </GlassCard>
    </div>
  );
}
