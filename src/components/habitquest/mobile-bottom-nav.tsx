"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDialogA11y } from "~/hooks/use-dialog-a11y";
import { cn } from "~/lib/ui/cn";
import { useClaimableRewards } from "~/hooks/use-claimable-rewards";
import { useHabitQuestStore } from "~/store/habitquest-store";

const tabs = [
  { id: "home", href: "/", label: "Home", icon: HomeIcon },
  { id: "habits", href: "/habits", label: "Habits", icon: HabitsIcon },
  { id: "progress", href: null, label: "Progress", icon: ProgressIcon },
  { id: "shop", href: "/shop", label: "Shop", icon: ShopIcon },
  { id: "more", href: null, label: "More", icon: MoreIcon },
] as const;

const progressLinks = [
  { href: "/boss", label: "Boss Fight", hint: "Weekly raid" },
  { href: "/season", label: "Season Pass", hint: "Track & claim" },
  { href: "/achievements", label: "Achievements", hint: "Trophy ledger" },
  { href: "/leaderboard", label: "Leaderboard", hint: "Rankings" },
] as const;

const accountLinks = [
  { href: "/guides", label: "Guides", hint: "How HabitQuest works" },
  { href: "/settings", label: "Settings", hint: "Profile & reminders" },
] as const;

type SheetId = "progress" | "more" | null;

function isProgressPath(pathname: string) {
  return ["/boss", "/season", "/achievements", "/leaderboard"].includes(pathname);
}

function isMorePath(pathname: string) {
  return pathname === "/guides" || pathname === "/settings" || pathname === "/admin";
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const isAdmin = useHabitQuestStore((state) => state.authUser?.role === "admin");
  const claimables = useClaimableRewards();
  const [sheet, setSheet] = useState<SheetId>(null);

  useEffect(() => {
    setSheet(null);
  }, [pathname]);

  const sheetLinks: Array<{ href: string; label: string; hint: string }> =
    sheet === "progress"
      ? [...progressLinks]
      : sheet === "more"
        ? [
            ...accountLinks,
            ...(isAdmin
              ? [{ href: "/admin", label: "Admin", hint: "Catalog & roles" }]
              : []),
          ]
        : [];

  return (
    <>
      {sheet ? (
        <NavSheet
          title={sheet === "progress" ? "Progress" : "Account"}
          links={sheetLinks}
          pathname={pathname}
          onClose={() => setSheet(null)}
        />
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0.5">
          {tabs.map((tab) => {
            const isSheetTab = tab.href === null;
            const active = isSheetTab
              ? tab.id === "progress"
                ? sheet === "progress" || isProgressPath(pathname)
                : sheet === "more" || isMorePath(pathname)
              : tab.href === "/"
                ? pathname === "/"
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;

            if (isSheetTab) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-expanded={sheet === tab.id}
                  onClick={() =>
                    setSheet((current) => (current === tab.id ? null : tab.id))
                  }
                  className={cn(
                    "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-xs transition",
                    active
                      ? "bg-white/10 text-white"
                      : "text-[var(--color-text-muted)] active:bg-white/5",
                  )}
                >
                  <span className="relative">
                    <Icon />
                    {tab.id === "progress" && claimables.length > 0 ? (
                      <span className="absolute -right-2.5 -top-1 rounded-full bg-amber-300/25 px-1 text-[9px] font-semibold text-amber-100">
                        {claimables.length > 9 ? "9+" : claimables.length}
                      </span>
                    ) : null}
                  </span>
                  {tab.label}
                </button>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setSheet(null)}
                className={cn(
                  "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-xs transition",
                  active
                    ? "bg-white/10 text-white"
                    : "text-[var(--color-text-muted)] active:bg-white/5",
                )}
              >
                <Icon />
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
        className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
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

function ProgressIcon() {
  return (
    <svg className={iconClass()} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 19V10M12 19V5M19 19v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg className={iconClass()} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8h12l-1 12H7L6 8Zm3 0V7a3 3 0 0 1 6 0v1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg className={iconClass()} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}
