"use client";

import { useMemo, useState, useTransition } from "react";
import {
  signInAction,
  signUpAction,
  type AuthActionResult,
} from "~/app/actions/auth";
import { syncHabitQuestOnAuthAction } from "~/app/actions/habitquest-sync";
import { GlassCard } from "~/components/habitquest/glass-card";
import { setCloudSyncEnabled } from "~/lib/habitquest/cloud-sync";
import { createSeedData } from "~/lib/habitquest/seed";
import {
  hasExtractableLocalProgress,
  peekHabitQuestLocalSave,
} from "~/lib/habitquest/storage";
import { useHabitQuestStore } from "~/store/habitquest-store";

type Mode = "signin" | "signup";

export function AuthGate() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const localSave = useMemo(() => peekHabitQuestLocalSave(), []);
  const canExtract = hasExtractableLocalProgress(localSave);

  const setAuthUser = useHabitQuestStore((state) => state.setAuthUser);
  const applyAuthenticatedSave = useHabitQuestStore((state) => state.applyAuthenticatedSave);

  function finishAuth(result: AuthActionResult) {
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    setAuthUser(result.user);
    setCloudSyncEnabled(true);

    startTransition(async () => {
      const sync = await syncHabitQuestOnAuthAction(localSave ?? createSeedData(), {
        extractLocal: canExtract,
      });

      if (sync.status !== "loaded") {
        setError(sync.status === "error" ? sync.error : "Could not load your save.");
        setCloudSyncEnabled(false);
        setAuthUser(null);
        return;
      }

      applyAuthenticatedSave(sync.data, {
        processDailyLogin: true,
      });
    });
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      if (mode === "signup") {
        const displayName =
          localSave?.settings.displayName || email.split("@")[0] || "";
        finishAuth(await signUpAction(email, password, displayName));
        return;
      }

      finishAuth(await signInAction(email, password));
    });
  }

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
          {mode === "signup" ? "Begin your journey" : "Welcome back, adventurer"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          Your habits travel with your account — pick up the path on any device.
        </p>

        {canExtract ? (
          <p className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
            Local progress waits in this browser. Sign in and we&apos;ll gather it into your
            account, then clear the local copy.
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 grid gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-full px-3 py-1.5 text-sm ${
                mode === "signin" ? "bg-white/10 text-white" : "text-[var(--color-text-muted)]"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-full px-3 py-1.5 text-sm ${
                mode === "signup" ? "bg-white/10 text-white" : "text-[var(--color-text-muted)]"
              }`}
            >
              Create account
            </button>
          </div>
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
          <button
            type="submit"
            disabled={pending}
            className="min-h-12 rounded-full hq-btn-accent px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {pending
              ? mode === "signup"
                ? "Creating account…"
                : "Signing in…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
      </GlassCard>
    </div>
  );
}
