"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { cn } from "~/lib/ui/cn";
import { useClaimableRewards } from "~/hooks/use-claimable-rewards";
import { useIncomingFriendRequestCount } from "~/hooks/use-incoming-friend-requests";
import { useHabitQuestStore } from "~/store/habitquest-store";

const tabs = [
  { id: "today", href: "/", label: "Today", icon: HomeIcon },
  { id: "habits", href: "/habits", label: "Habits", icon: HabitsIcon },
  { id: "rewards", href: "/week", label: "Rewards", icon: SeasonIcon },
  { id: "friends", href: "/friends", label: "Friends", icon: FriendsIcon },
  { id: "shop", href: "/shop", label: "Shop", icon: ShopIcon },
  { id: "you", href: null, label: "You", icon: ProfileIcon },
] as const;

const youLinks = [
  { href: "/profile", label: "Profile", hint: "Identity & honors" },
  { href: "/achievements", label: "Achievements", hint: "Milestones" },
  { href: "/leaderboard", label: "Streak board", hint: "Rankings" },
  { href: "/guides", label: "Guides", hint: "How it works" },
  { href: "/settings", label: "Settings", hint: "Reminders" },
] as const;

function isYouPath(pathname: string) {
  return (
    pathname === "/profile" ||
    pathname === "/inventory" ||
    pathname === "/achievements" ||
    pathname === "/leaderboard" ||
    pathname === "/guides" ||
    pathname === "/settings" ||
    pathname === "/admin"
  );
}

function tabBadgeCount(
  href: string | null,
  claimables: ReturnType<typeof useClaimableRewards>,
) {
  if (href === "/week") {
    return claimables.filter(
      (c) =>
        c.kind === "season" ||
        c.kind === "quest" ||
        (c.kind === "challenge" &&
          (c.href.startsWith("/week") || c.href.startsWith("/season"))),
    ).length;
  }
  return 0;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const isAdmin = useHabitQuestStore((state) => state.authUser?.role === "admin");
  const claimables = useClaimableRewards();
  const incomingFriendRequests = useIncomingFriendRequestCount();
  const [youOpen, setYouOpen] = useState(false);

  useEffect(() => {
    setYouOpen(false);
  }, [pathname]);

  const sheetLinks: Array<{ href: string; label: string; hint: string }> = [
    ...youLinks,
    ...(isAdmin ? [{ href: "/admin", label: "Admin", hint: "Catalog & roles" }] : []),
  ];

  return (
    <>
      {youOpen ? (
        <NavSheet
          title="You"
          links={sheetLinks}
          pathname={pathname}
          onClose={() => setYouOpen(false)}
        />
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0.5">
          {tabs.map((tab) => {
            const isYouTab = tab.href === null;
            const active = isYouTab
              ? youOpen || isYouPath(pathname)
              : tab.id === "rewards"
                ? pathname === "/week" || pathname === "/season"
                : tab.href === "/"
                  ? pathname === "/"
                  : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;

            if (isYouTab) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-expanded={youOpen}
                  onClick={() => setYouOpen((current) => !current)}
                  className={cn(
                    "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1.5 text-[10px] transition sm:px-1 sm:text-xs",
                    active
                      ? "bg-white/10 text-white"
                      : "text-[var(--color-text-muted)] active:bg-white/5",
                  )}
                >
                  <Icon />
                  {tab.label}
                </button>
              );
            }

            const badge =
              tab.id === "friends" ? incomingFriendRequests : tabBadgeCount(tab.href, claimables);

            return (
              <Link
                key={tab.id}
                href={tab.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                onClick={() => setYouOpen(false)}
                className={cn(
                  "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1.5 text-[10px] transition sm:px-1 sm:text-xs",
                  active
                    ? "bg-white/10 text-white"
                    : "text-[var(--color-text-muted)] active:bg-white/5",
                )}
              >
                <span className="relative">
                  <Icon />
                  {badge > 0 ? (
                    <span className="absolute -right-2.5 -top-1 rounded-full bg-amber-300/25 px-1 text-[9px] font-semibold text-amber-100">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function NavSheet({
  title,
  links,
  pathname,
  onClose,
}: {
  title: string;
  links: Array<{ href: string; label: string; hint: string }>;
  pathname: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(panelRef, onClose);

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-x-0 bottom-0 top-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 px-3 lg:hidden">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className="mx-auto max-w-lg overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/96 p-2 outline-none"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
            {title}
          </p>
          <div className="grid gap-1">
            {links.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center justify-between rounded-2xl px-3 py-2.5 transition",
                    active
                      ? "bg-white/10 text-white"
                      : "text-[var(--color-text-muted)] hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{item.hint}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function iconClass() {
  return "h-[1.15rem] w-[1.15rem]";
}

function HomeIcon() {
  return (
    <svg className={iconClass()} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HabitsIcon() {
  return (
    <svg className={iconClass()} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 7h12M8 12h12M8 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 7.2 5.2 8.5 7 6M4 12.2 5.2 13.5 7 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SeasonIcon() {
  return (
    <svg className={iconClass()} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg className={iconClass()} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.5 18.2c.9-2.4 2.6-3.6 4.5-3.6s3.6 1.2 4.5 3.6M13.2 14.8c1.4-.3 2.6.1 3.5 1.1 1 .9 1.6 2 1.8 3.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg className={iconClass()} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8h12l-1 11H7L6 8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8V7a3 3 0 0 1 6 0v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className={iconClass()} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19.2c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
