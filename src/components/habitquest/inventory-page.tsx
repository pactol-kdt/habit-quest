"use client";

import Link from "next/link";
import { GlassCard } from "~/components/habitquest/glass-card";
import { ProfileWardrobe } from "~/components/habitquest/profile-wardrobe";
import { PAGE_HEROES } from "~/lib/habitquest/copy";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function InventoryPage() {
  const {
    hydrated,
    shopItems,
    equippedItems,
    equipShopItem,
    pendingShopItemIds,
  } = useHabitQuestStore((state) => state);
  const hero = PAGE_HEROES.inventory;

  if (!hydrated) {
    return (
      <div className="grid min-w-0 gap-4 pt-4 md:gap-6 md:pt-6">
        <div className="glass-panel h-48 animate-pulse rounded-[2rem]" />
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="overflow-hidden rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
          {hero.eyebrow}
        </p>
        <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
          {hero.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base">
          {hero.support}
        </p>
        <Link
          href="/profile"
          className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text-muted)] transition hover:border-white/20 hover:text-white"
        >
          Back to Profile
        </Link>
      </GlassCard>

      <ProfileWardrobe
        shopItems={shopItems}
        equippedItems={equippedItems}
        pendingShopItemIds={pendingShopItemIds}
        onEquip={equipShopItem}
      />
    </div>
  );
}
