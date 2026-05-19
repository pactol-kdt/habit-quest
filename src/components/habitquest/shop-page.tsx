"use client";

import { useState } from "react";
import { GlassCard } from "~/components/habitquest/glass-card";
import { ProfilePanel } from "~/components/habitquest/profile-panel";
import { PurchaseModal } from "~/components/habitquest/purchase-modal";
import { ShopItemCard } from "~/components/habitquest/shop-item-card";
import { cn } from "~/lib/ui/cn";
import { isFeatureUnlocked } from "~/lib/habitquest/utils";
import { useHabitQuestStore } from "~/store/habitquest-store";
import type { ShopCategory, ShopItem } from "~/types/habitquest";

const categoryLabels: Record<ShopCategory, string> = {
  title: "Titles",
  frame: "Profile Frames",
  avatar: "Avatars",
};

export function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>("title");
  const [pendingPurchase, setPendingPurchase] = useState<ShopItem | null>(null);

  const {
    shopItems,
    equippedItems,
    levelUnlocks,
    userProgress,
    purchaseShopItem,
    equipShopItem,
    wallet,
    challenges,
    achievements,
    habits,
    completions,
    dailyRewards,
  } = useHabitQuestStore((state) => state);

  const filteredItems = shopItems.filter((item) => item.category === selectedCategory);

  return (
    <div className="grid gap-6 pt-6">
      <GlassCard className="rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
              In-App Shop
            </p>
            <h1 className="section-title mt-2 text-4xl text-white md:text-5xl">
              Cosmetic armory
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--color-text-muted)]">
              Spend coins on titles, frames, and avatars. Exclusive items come from challenge rewards.
            </p>
          </div>
          <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
            Balance: {wallet.totalCoins} coins
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <ProfilePanel
          data={{
            shopItems,
            equippedItems,
            levelUnlocks,
            userProgress,
            wallet,
            habits,
            completions,
            challenges,
            achievements,
            dailyRewards,
          }}
        />

        <GlassCard className="h-full">
          <div className="mb-5 flex flex-wrap gap-2">
            {(Object.keys(categoryLabels) as ShopCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition",
                  selectedCategory === category
                    ? "bg-white/10 text-white"
                    : "bg-white/5 text-[var(--color-text-muted)] hover:text-white",
                )}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredItems.map((item) => {
              const lockedByFeature = item.requiredFeature
                ? !isFeatureUnlocked(levelUnlocks, item.requiredFeature)
                : false;
              const lockedByLevel = userProgress.level < item.requiredLevel;
              const locked = (!item.owned && lockedByFeature) || (!item.owned && lockedByLevel);
              const lockReason = lockedByFeature
                ? `Requires ${item.requiredLevel} and a feature unlock.`
                : lockedByLevel
                  ? `Unlocks at level ${item.requiredLevel}.`
                  : null;

              const equipped =
                equippedItems.titleItemId === item.id ||
                equippedItems.frameItemId === item.id ||
                equippedItems.avatarItemId === item.id;

              return (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  locked={locked}
                  lockReason={lockReason}
                  equipped={equipped}
                  onPurchase={setPendingPurchase}
                  onEquip={equipShopItem}
                />
              );
            })}
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
