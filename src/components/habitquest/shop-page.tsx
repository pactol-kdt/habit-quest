"use client";

import { useState } from "react";
import { GlassCard } from "~/components/habitquest/glass-card";
import { CoinIcon } from "~/components/habitquest/icons/coin-icon";
import { ProfilePanel } from "~/components/habitquest/profile-panel";
import { PurchaseModal } from "~/components/habitquest/purchase-modal";
import { ShopItemCard } from "~/components/habitquest/shop-item-card";
import { PAGE_HEROES } from "~/lib/habitquest/copy";
import { cn } from "~/lib/ui/cn";
import { isFeatureUnlocked } from "~/lib/habitquest/utils";
import { getShopLadderLockReason } from "~/lib/habitquest/shop-mutations";
import { useEffectiveProgress } from "~/hooks/use-effective-progress";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { ShopCategory, ShopItem } from "~/types/habitquest";

const categoryLabels: Record<ShopCategory, string> = {
  title: "Titles",
  frame: "Profile Frames",
  avatar: "Avatars",
  theme: "Themes",
};

export function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>("title");
  const [pendingPurchase, setPendingPurchase] = useState<ShopItem | null>(null);

  const {
    shopItems,
    equippedItems,
    levelUnlocks,
    purchaseShopItem,
    equipShopItem,
    unequipShopItem,
    pendingShopItemIds,
    wallet,
    challenges,
    achievements,
    habits,
    completions,
    dailyRewards,
    settings,
    version,
    rewardSystems,
    questArcs,
    seasonPass,
    weeklyBoss,
    userProgress: settledProgress,
  } = useHabitQuestStore((state) => state);
  const { userProgress } = useEffectiveProgress();

  const filteredItems = shopItems.filter((item) => item.category === selectedCategory);
  const hero = PAGE_HEROES.shop;

  return (
    <div className="grid gap-4 pt-4 md:gap-6 md:pt-6">
      <GlassCard className="rounded-[1.75rem] p-4 md:rounded-[2rem] md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              {hero.eyebrow}
            </p>
            <h1 className="section-title mt-2 text-2xl text-white sm:text-4xl md:text-5xl">
              {hero.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
              {hero.support}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 lg:self-auto">
            <CoinIcon size={15} title="Coins" />
            <span className="tabular-nums">{wallet.totalCoins}</span>
            <span className="text-amber-100/70">spendable</span>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <ProfilePanel
          data={{
            version,
            shopItems,
            equippedItems,
            levelUnlocks,
            userProgress: settledProgress,
            wallet,
            habits,
            completions,
            challenges,
            achievements,
            dailyRewards,
            settings,
            rewardSystems,
            questArcs,
            seasonPass,
            weeklyBoss,
          }}
        />

        <GlassCard className="h-full overflow-hidden">
          <div className="scrollbar-none -mx-1 mb-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
            {(Object.keys(categoryLabels) as ShopCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "min-h-11 shrink-0 snap-start rounded-full px-4 py-2 text-sm transition",
                  selectedCategory === category
                    ? "bg-white/10 text-white"
                    : "bg-white/5 text-[var(--color-text-muted)] hover:text-white",
                )}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>

          <div className="max-h-[68vh] overflow-y-auto pr-1 md:max-h-none md:overflow-visible md:pr-0">
            <div className="grid gap-4 md:grid-cols-2">
            {filteredItems.map((item) => {
              const lockedByFeature = item.requiredFeature
                ? !isFeatureUnlocked(levelUnlocks, item.requiredFeature)
                : false;
              const lockedByLevel = userProgress.level < item.requiredLevel;
              const ladderLockReason =
                !item.owned && !item.exclusive
                  ? getShopLadderLockReason(shopItems, item)
                  : null;
              const locked =
                (!item.owned && lockedByFeature) ||
                (!item.owned && lockedByLevel) ||
                Boolean(ladderLockReason);
              const lockReason = lockedByFeature
                ? `Requires ${item.requiredLevel} and a feature unlock.`
                : lockedByLevel
                  ? `Unlocks at level ${item.requiredLevel}.`
                  : ladderLockReason;

              const equipped =
                equippedItems.titleItemId === item.id ||
                equippedItems.frameItemId === item.id ||
                equippedItems.avatarItemId === item.id ||
                equippedItems.themeItemId === item.id;
              const pending =
                pendingShopItemIds.includes(item.id) ||
                pendingShopItemIds.includes(`unequip:${item.category}`);

              return (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  locked={locked}
                  lockReason={lockReason}
                  equipped={equipped}
                  pending={pending}
                  onPurchase={setPendingPurchase}
                  onEquip={equipShopItem}
                  onUnequip={unequipShopItem}
                />
              );
            })}
            </div>
          </div>
        </GlassCard>
      </div>

      <PurchaseModal
        item={pendingPurchase}
        onClose={() => setPendingPurchase(null)}
        onConfirm={purchaseShopItem}
      />
    </div>
  );
}
