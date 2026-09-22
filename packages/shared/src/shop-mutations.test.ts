import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getBuiltinCatalog } from "./catalog.ts";
import { createSeedData } from "./seed.ts";
import {
  applyPurchaseShopItem,
  getPurchasableLadder,
} from "./shop-mutations.ts";
import type { HabitQuestData } from "./types.ts";

function withCoins(data: HabitQuestData, coins: number): HabitQuestData {
  return {
    ...data,
    wallet: {
      ...data.wallet,
      totalCoins: coins,
      lifetimeCoinsEarned: Math.max(data.wallet.lifetimeCoinsEarned, coins),
    },
  };
}

function unlockFeatures(data: HabitQuestData): HabitQuestData {
  return {
    ...data,
    userProgress: { ...data.userProgress, level: 99 },
    levelUnlocks: data.levelUnlocks.map((entry) => ({
      ...entry,
      unlocked: true,
      unlockedAt: entry.unlockedAt ?? new Date().toISOString(),
    })),
  };
}

describe("progressive shop ladder", () => {
  it("orders purchasable titles by price and skips exclusives", () => {
    const catalog = getBuiltinCatalog();
    const ladder = getPurchasableLadder(catalog.shopItems, "title");
    assert.deepEqual(
      ladder.map((item) => item.id),
      [
        "title_beginner",
        "title_dawn_runner",
        "title_habit_hunter",
        "title_iron_week",
        "title_discipline_master",
        "title_night_grinder",
      ],
    );
    assert.equal(
      catalog.shopItems.some((item) => item.category === "title" && item.exclusive),
      true,
    );
  });

  it("chains purchasable themes Coastal Mist → Archive Sepia → Midnight", () => {
    const catalog = getBuiltinCatalog();
    assert.deepEqual(
      getPurchasableLadder(catalog.shopItems, "theme").map((item) => item.id),
      ["theme_coastal_mist", "theme_archive_sepia", "theme_midnight"],
    );
  });

  it("allows buying a later tier without owning earlier ones", () => {
    const data = unlockFeatures(withCoins(createSeedData(), 500));
    const skip = applyPurchaseShopItem(data, "title_dawn_runner");
    assert.equal(skip.ok, true);
  });

  it("allows buying a high tier while a mid tier is owned and earlier tiers are missing", () => {
    const base = unlockFeatures(withCoins(createSeedData(), 1000));
    const data: HabitQuestData = {
      ...base,
      shopItems: base.shopItems.map((item) =>
        item.id === "title_habit_hunter" ? { ...item, owned: true } : item,
      ),
    };

    const skip = applyPurchaseShopItem(data, "title_iron_week");
    assert.equal(skip.ok, true);
  });

  it("rejects exclusive items as not for sale", () => {
    const data = unlockFeatures(withCoins(createSeedData(), 1000));
    const exclusive = data.shopItems.find((item) => item.exclusive);
    assert.ok(exclusive);
    const blocked = applyPurchaseShopItem(data, exclusive.id);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.match(blocked.error, /exclusive/i);
    }
  });
});
