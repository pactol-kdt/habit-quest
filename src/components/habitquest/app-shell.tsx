"use client";

import { AuthGate } from "~/components/habitquest/auth-gate";
import { CelebrationOverlay } from "~/components/habitquest/celebration-overlay";
import { OnboardingModal } from "~/components/habitquest/onboarding-modal";
import { FloatingRewardLayer } from "~/components/habitquest/floating-reward-layer";
import { MobileBottomNav } from "~/components/habitquest/mobile-bottom-nav";
import { Navigation } from "~/components/habitquest/navigation";
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
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="glass-panel h-40 w-full max-w-md animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  if (!authUser) {
    return <AuthGate />;
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="glass-panel h-40 w-full max-w-md animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Navigation />
      <RewardToastLayer />
      <FloatingRewardLayer />
      <CelebrationOverlay />
      <OnboardingModal />
      <SettlementRecapModal />
      <div className="mx-auto w-full max-w-7xl px-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-6 md:pt-8 lg:pb-10">
        {children}
      </div>
      <MobileBottomNav />
    </div>
  );
}
