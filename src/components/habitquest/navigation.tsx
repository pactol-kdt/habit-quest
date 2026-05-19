"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { AvatarWithFrame } from "~/components/habitquest/cosmetic-art";
import { GlassCard } from "~/components/habitquest/glass-card";
import { cn } from "~/lib/ui/cn";
import { formatNumber, getProfileDisplay } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/shop", label: "Shop" },
  { href: "/achievements", label: "Achievements" },
];

export function Navigation() {
  const pathname = usePathname();
  const { hydrated, wallet, shopItems, equippedItems, userProgress } = useHabitQuestStore((state) => state);
  const profile = getProfileDisplay(shopItems, equippedItems);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
      <GlassCard className="mx-auto max-w-7xl rounded-[1.75rem] px-3 py-3 md:rounded-[2rem] md:px-5 md:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
            <Link href="/" className="section-title text-lg text-white md:text-2xl">
              HabitQuest
            </Link>
            <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-2 text-sm transition md:px-4",
                      active
                        ? "bg-white/10 text-white"
                        : "text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <motion.div
              key={wallet.totalCoins}
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 sm:px-4 sm:text-sm"
            >
              Coins: {hydrated ? formatNumber(wallet.totalCoins) : "..."}
            </motion.div>
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-2 pr-3 sm:gap-3 sm:pr-4">
              <AvatarWithFrame
                avatar={profile.avatar}
                frame={profile.frame}
                className="h-11 w-11 border border-white/10"
              />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium text-white">
                  {profile.title?.name ?? "Unranked Adventurer"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">Level {userProgress.level}</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </header>
  );
}
