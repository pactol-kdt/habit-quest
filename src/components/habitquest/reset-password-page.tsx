"use client";

import { Suspense, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GlassCard } from "~/components/habitquest/glass-card";
import {
  PASSWORD_RESET_DISABLED_MESSAGE,
  PASSWORD_RESET_ENABLED,
} from "~/lib/auth/password-reset-enabled";
import { resetPasswordRequest } from "~/lib/v1/requests";

function PasswordResetUnavailable() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-3 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(251,191,36,0.12),_transparent_40%)]" />
      <GlassCard className="relative z-10 w-full max-w-md rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          HabitQuest
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-3xl">Password reset</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
          {PASSWORD_RESET_DISABLED_MESSAGE}
        </p>
        <p className="mt-5 text-sm">
          <Link href="/" className="text-cyan-200 underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordRequest(token, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-3 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(251,191,36,0.12),_transparent_40%)]" />
      <GlassCard className="relative z-10 w-full max-w-md rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          HabitQuest
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-3xl">Choose a new password</h1>

        {!token ? (
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
            This reset link is missing a token. Request a new one from the sign-in screen.
          </p>
        ) : done ? (
          <p className="mt-3 text-sm leading-6 text-cyan-50">
            Password updated. You can sign in with it now.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
              Pick a password at least 8 characters long. The link expires after one hour.
            </p>
            <form onSubmit={onSubmit} className="mt-5 grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm text-[var(--color-text-muted)]">New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-[var(--color-text-muted)]">Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-cyan-300/50"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="min-h-12 rounded-full hq-btn-accent px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {pending ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}

        {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

        <p className="mt-5 text-sm">
          <Link href="/" className="text-cyan-200 underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}

export function ResetPasswordPage() {
  if (!PASSWORD_RESET_ENABLED) {
    return <PasswordResetUnavailable />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-text-muted)]">
          Loading reset form…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
