"use client";

import { AuthGate } from "~/components/habitquest/auth-gate";
import { CelebrationOverlay } from "~/components/habitquest/celebration-overlay";
import { OnboardingModal } from "~/components/habitquest/onboarding-modal";
import { FloatingRewardLayer } from "~/components/habitquest/floating-reward-layer";
import { MobileBottomNav } from "~/components/habitquest/mobile-bottom-nav";
import { Navigation } from "~/components/habitquest/navigation";
import { NotificationPermissionPrompt } from "~/components/habitquest/notification-permission-prompt";
import { RewardToastLayer } from "~/components/habitquest/reward-toast-layer";
import { SettlementRecapModal } from "~/components/habitquest/settlement-recap-modal";
import { useHabitQuestHydration } from "~/hooks/use-habitquest-hydration";
import { useHabitQuestReminders } from "~/hooks/use-habitquest-reminders";
import { useHabitQuestStore } from "~/store/habitquest-store";
import { useEffect } from "react";

const THEME_STYLE_KEYS = [
  "--color-bg",
  "--color-bg-muted",
  "--color-cyan",
  "--color-pink",
  "--color-gold",
  "--color-green",
  "--hq-accent-ink",
] as const;

function BootLoader({ message = "Gathering your path…" }: { message?: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(251,191,36,0.1),_transparent_40%)]" />
      <div className="glass-panel relative z-10 flex w-full max-w-md flex-col items-center gap-5 rounded-[2rem] px-8 py-12 text-center">
        <img
          src="/brand/habitquest-logo.png"
          alt="HabitQuest"
          className="h-20 w-20 rounded-2xl border border-white/10 object-cover shadow-[0_0_40px_rgba(56,217,255,0.12)]"
        />
        <h1 className="section-title text-3xl text-white sm:text-4xl">Habit Quest</h1>
        <div
          className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label={message}
        >
          <div className="hq-boot-bar hq-fill-accent h-full w-2/5 rounded-full" />
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  useHabitQuestHydration();
  useHabitQuestReminders();

  const authChecked = useHabitQuestStore((state) => state.authChecked);
  const authUser = useHabitQuestStore((state) => state.authUser);
  const hydrated = useHabitQuestStore((state) => state.hydrated);
  const shopItems = useHabitQuestStore((state) => state.shopItems);
  const equippedItems = useHabitQuestStore((state) => state.equippedItems);

  useEffect(() => {
    const root = document.documentElement;
    const theme = shopItems.find((item) => item.id === equippedItems.themeItemId);
    const vars = theme?.themeVars;

    for (const key of THEME_STYLE_KEYS) {
      root.style.removeProperty(key);
    }

    if (!vars) {
      return;
    }

    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }

    return () => {
      for (const key of THEME_STYLE_KEYS) {
        root.style.removeProperty(key);
      }
    };
  }, [equippedItems.themeItemId, shopItems]);

  if (!authChecked) {
    return <BootLoader message="Recognizing your traveler…" />;
  }

  if (!authUser) {
    return <AuthGate />;
  }

  if (!hydrated) {
    return <BootLoader message="Gathering your path…" />;
  }

  return (
    <div className="relative min-h-screen">
      <Navigation />
      <RewardToastLayer />
      <FloatingRewardLayer />
      <CelebrationOverlay />
      <OnboardingModal />
      <NotificationPermissionPrompt />
      <SettlementRecapModal />
      <div className="mx-auto w-full max-w-7xl px-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-6 md:pt-8 lg:pb-10">
        {children}
      </div>
      <MobileBottomNav />
    </div>
  );
}
