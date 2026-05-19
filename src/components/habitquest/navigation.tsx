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
    <header className="sticky top-0 z-40 px-4 pt-4 md:px-6">
      <GlassCard className="mx-auto max-w-7xl rounded-[2rem] px-4 py-4 md:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="section-title text-xl text-white md:text-2xl">
              HabitQuest
            </Link>
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm transition",
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

          <div className="flex flex-wrap items-center gap-3">
            <motion.div
              key={wallet.totalCoins}
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-100"
            >
              Coins: {hydrated ? formatNumber(wallet.totalCoins) : "..."}
            </motion.div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-2 pr-4">
              <AvatarWithFrame
                avatar={profile.avatar}
                frame={profile.frame}
                className="h-11 w-11 border border-white/10"
              />
              <div className="leading-tight">
                <p className="text-sm font-medium text-white">
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
