import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getBuiltinCatalog } from "./catalog.ts";
import { createSeedData } from "./seed.ts";
import {
  applyPurchaseShopItem,
  getPurchasableLadder,
  getShopLadderLockReason,
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

  it("blocks buying the next tier until the previous is owned", () => {
    const data = unlockFeatures(withCoins(createSeedData(), 500));
    const blocked = applyPurchaseShopItem(data, "title_dawn_runner");
    assert.equal(blocked.ok, false);
    if (blocked.ok) {
      return;
    }
    assert.equal(blocked.error, "Own Initiate first");
    assert.equal(getShopLadderLockReason(data.shopItems, data.shopItems.find((i) => i.id === "title_dawn_runner")!), "Own Initiate first");

    const first = applyPurchaseShopItem(data, "title_beginner");
    assert.equal(first.ok, true);
    if (!first.ok) {
      return;
    }

    const second = applyPurchaseShopItem(first.data, "title_dawn_runner");
    assert.equal(second.ok, true);
  });

  it("blocks later tiers when a mid tier is owned but earlier tiers are missing", () => {
    const base = unlockFeatures(withCoins(createSeedData(), 1000));
    const data: HabitQuestData = {
      ...base,
      shopItems: base.shopItems.map((item) =>
        item.id === "title_habit_hunter" ? { ...item, owned: true } : item,
      ),
    };

    // Owns T3 (Habit Hunter) without T1–T2 → cannot buy T4 (Iron Week) yet.
    const skip = applyPurchaseShopItem(data, "title_iron_week");
    assert.equal(skip.ok, false);
    if (!skip.ok) {
      assert.equal(skip.error, "Own Initiate first");
    }

    const t1 = applyPurchaseShopItem(data, "title_beginner");
    assert.equal(t1.ok, true);
    if (!t1.ok) {
      return;
    }
    const stillBlocked = applyPurchaseShopItem(t1.data, "title_iron_week");
    assert.equal(stillBlocked.ok, false);
    if (!stillBlocked.ok) {
      assert.equal(stillBlocked.error, "Own Dawn Runner first");
    }

    const t2 = applyPurchaseShopItem(t1.data, "title_dawn_runner");
    assert.equal(t2.ok, true);
    if (!t2.ok) {
      return;
    }
    const t4 = applyPurchaseShopItem(t2.data, "title_iron_week");
    assert.equal(t4.ok, true);
  });
});
