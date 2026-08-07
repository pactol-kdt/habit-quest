"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "~/lib/ui/cn";
import { useHabitQuestStore } from "~/store/habitquest-store";

const tabs = [
  { id: "home", href: "/", label: "Home" },
  { id: "habits", href: "/habits", label: "Habits" },
  { id: "progress", href: null, label: "Progress" },
  { id: "shop", href: "/shop", label: "Shop" },
  { id: "more", href: null, label: "More" },
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
  const [sheet, setSheet] = useState<SheetId>(null);

  useEffect(() => {
    setSheet(null);
  }, [pathname]);

  useEffect(() => {
    if (!sheet) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSheet(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sheet]);

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
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          onClick={() => setSheet(null)}
        />
      ) : null}

      {sheet ? (
        <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 px-3 lg:hidden">
          <div
            role="dialog"
            aria-label={sheet === "progress" ? "Progress pages" : "Account pages"}
            className="mx-auto max-w-lg overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/96 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          >
            <p className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
              {sheet === "progress" ? "Progress" : "Account"}
            </p>
            <div className="grid gap-1">
              {sheetLinks.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSheet(null)}
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
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden">
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
                    "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-[11px] transition",
                    active
                      ? "bg-white/10 text-white"
                      : "text-[var(--color-text-muted)] active:bg-white/5",
                  )}
                >
                  {tab.label}
                </button>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => setSheet(null)}
                className={cn(
                  "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-2xl px-1 py-1.5 text-[11px] transition",
                  active
                    ? "bg-white/10 text-white"
                    : "text-[var(--color-text-muted)] active:bg-white/5",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
