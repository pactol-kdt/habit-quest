"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { AvatarWithFrame } from "~/components/habitquest/cosmetic-art";
import { GlassCard } from "~/components/habitquest/glass-card";
import { CoinIcon } from "~/components/habitquest/icons/coin-icon";
import { StreakFlame } from "~/components/habitquest/streak-flame";
import { cn } from "~/lib/ui/cn";
import { formatNumber, getProfileDisplay } from "~/lib/habitquest/utils";
import { getStreakFireTier } from "~/lib/habitquest/streak-fire-tier";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import { useClaimableRewards } from "~/hooks/use-claimable-rewards";
import { useHabitQuestStore } from "~/store/habitquest-store";

type NavLink = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

const primaryNav: NavLink[] = [
  { href: "/", label: "Dashboard" },
  { href: "/habits", label: "Habits" },
];

const progressNav: NavLink[] = [
  { href: "/boss", label: "Boss Fight" },
  { href: "/season", label: "Season Pass" },
  { href: "/achievements", label: "Achievements" },
  { href: "/leaderboard", label: "Leaderboard" },
];

const accountNav: NavLink[] = [
  { href: "/profile", label: "Profile" },
  { href: "/guides", label: "Guides" },
  { href: "/settings", label: "Settings" },
  { href: "/admin", label: "Admin", adminOnly: true },
];

function navLinkClass(active: boolean) {
  return cn(
    "block w-full rounded-2xl px-3 py-2.5 text-left text-sm transition md:px-4",
    active
      ? "bg-white/10 text-white"
      : "text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white",
  );
}

function navButtonClass(active: boolean, open: boolean) {
  return cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm transition md:px-4",
    active || open
      ? "bg-white/10 text-white"
      : "text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white",
  );
}

type NavMenuProps = {
  label: string;
  items: NavLink[];
  pathname: string;
  isAdmin: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  badgeCount?: number;
};

function NavMenu({
  label,
  items,
  pathname,
  isAdmin,
  open,
  onToggle,
  onClose,
  badgeCount = 0,
}: NavMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const visibleItems = items.filter((item) => !item.adminOnly || isAdmin);
  const active = visibleItems.some((item) => item.href === pathname);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
        className={navButtonClass(active, open)}
      >
        {label}
        {badgeCount > 0 ? (
          <span className="rounded-full bg-amber-300/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
        <span
          aria-hidden
          className={cn(
            "text-[10px] transition-transform",
            open ? "rotate-180" : "",
          )}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-[11rem] rounded-[1.25rem] border border-white/10 bg-slate-950/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        >
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={onClose}
              className={navLinkClass(pathname === item.href)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<"progress" | "account" | null>(null);
  const { hydrated, shopItems, equippedItems, settings, authUser, wallet, exitGuestPlay } =
    useHabitQuestStore((state) => state);
  const { userProgress } = useEffectiveProgress();
  const claimables = useClaimableRewards();
  const spendableCoins = wallet.totalCoins;
  const currentStreak = userProgress.currentStreak;
  const streakTier = getStreakFireTier(currentStreak);
  const streakLabel =
    currentStreak === 1 ? "1-day streak" : `${currentStreak}-day streak`;
  const profile = getProfileDisplay(shopItems, equippedItems);
  const displayName = settings.displayName.trim() || profile.title?.name || "Unranked Adventurer";
  const isAdmin = authUser?.role === "admin";

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3 md:px-6 md:pt-4">
      <GlassCard className="mx-auto max-w-7xl rounded-[1.35rem] px-2.5 py-2 sm:rounded-[1.75rem] sm:px-3 sm:py-3 md:rounded-[2rem] md:px-5 md:py-4">
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 lg:gap-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-white sm:gap-2.5"
            >
              <img
                src="/brand/habitquest-logo.png"
                alt=""
                className="h-8 w-8 rounded-lg border border-white/10 object-cover sm:h-9 sm:w-9 md:h-10 md:w-10"
              />
              <span className="section-title sr-only text-lg xl:not-sr-only xl:inline xl:text-2xl">
                HabitQuest
              </span>
            </Link>
            <motion.div
              key={currentStreak}
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              title={hydrated ? streakLabel : "Streak"}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-orange-300/25 bg-orange-400/10 px-2 py-1.5 text-[11px] text-orange-50 sm:gap-1.5 sm:px-2.5 sm:text-sm"
            >
              <StreakFlame tier={streakTier} size="xs" />
              <span className="tabular-nums font-semibold">
                {hydrated ? currentStreak : "..."}
              </span>
              <span className="sr-only">
                {hydrated ? ` ${currentStreak === 1 ? "day" : "days"} streak` : " streak"}
              </span>
            </motion.div>
            <nav className="hidden items-center gap-2 lg:flex">
              {primaryNav.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={navButtonClass(active, false)}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <NavMenu
                label="Progress"
                items={progressNav}
                pathname={pathname}
                isAdmin={isAdmin}
                badgeCount={claimables.length}
                open={openMenu === "progress"}
                onToggle={() =>
                  setOpenMenu((current) => (current === "progress" ? null : "progress"))
                }
                onClose={() => setOpenMenu(null)}
              />

              <Link
                href="/shop"
                className={navButtonClass(pathname === "/shop", false)}
              >
                Shop
              </Link>

              <NavMenu
                label="Account"
                items={accountNav}
                pathname={pathname}
                isAdmin={isAdmin}
                open={openMenu === "account"}
                onToggle={() =>
                  setOpenMenu((current) => (current === "account" ? null : "account"))
                }
                onClose={() => setOpenMenu(null)}
              />
            </nav>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3">
            {!authUser ? (
              <button
                type="button"
                onClick={() => exitGuestPlay()}
                className="min-h-10 shrink-0 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] text-cyan-100 transition hover:border-cyan-300/50 sm:px-3 sm:text-xs"
              >
                <span className="sm:hidden">Save</span>
                <span className="hidden sm:inline">Save progress</span>
              </button>
            ) : null}
            <motion.div
              key={spendableCoins}
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="hq-chip-gold inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
              title="Spendable coins (preview rewards lock in tonight)"
            >
              <CoinIcon size={14} className="sm:hidden" title="Coins" />
              <CoinIcon size={16} className="hidden sm:block" title="Coins" />
              <span className="tabular-nums">
                {hydrated ? formatNumber(spendableCoins) : "..."}
              </span>
            </motion.div>
            <Link
              href="/profile"
              aria-label={`Profile for ${displayName}`}
              className="flex min-w-0 max-w-[7.5rem] items-center gap-1.5 rounded-full border border-white/10 bg-white/5 p-1 transition hover:border-white/20 sm:max-w-none sm:gap-3 sm:py-2 sm:pl-2 sm:pr-4"
            >
              <AvatarWithFrame
                avatar={profile.avatar}
                frame={profile.frame}
                className="h-9 w-9 shrink-0 border border-white/10 sm:h-11 sm:w-11"
              />
              <div className="min-w-0 flex-1 leading-tight pr-1.5 sm:pr-0">
                <p className="hidden truncate text-sm font-medium text-white sm:block">
                  {displayName}
                </p>
                <p className="truncate text-[10px] text-[var(--color-text-muted)] sm:text-xs">
                  {profile.title?.name ? (
                    <>
                      <span className="text-white/90 sm:text-[var(--color-text-muted)]">
                        {profile.title.name}
                      </span>
                      <span className="hidden sm:inline">{` • Level ${userProgress.level}`}</span>
                      <span className="sm:hidden">{` · Lv ${userProgress.level}`}</span>
                    </>
                  ) : (
                    <>
                      <span className="sm:hidden">Lv {userProgress.level}</span>
                      <span className="hidden sm:inline">Level {userProgress.level}</span>
                    </>
                  )}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </GlassCard>
    </header>
  );
}
