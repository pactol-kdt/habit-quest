import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureStarterCosmetics, getBuiltinCatalog } from "./catalog.ts";
import { createSeedData } from "./seed.ts";
import {
  applyPurchaseShopItem,
  applyUnequipShopItem,
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

describe("starter cosmetics", () => {
  it("owns and equips a default in every slot", () => {
    const data = createSeedData();
    assert.equal(data.equippedItems.avatarItemId, "avatar_default");
    assert.equal(data.equippedItems.frameItemId, "frame_default");
    assert.equal(data.equippedItems.titleItemId, "title_default");
    assert.equal(data.equippedItems.themeItemId, "theme_default");
    for (const id of ["avatar_default", "frame_default", "title_default", "theme_default"]) {
      assert.equal(data.shopItems.find((item) => item.id === id)?.owned, true);
    }
  });

  it("fills an empty slot with the starter and leaves a worn item in place", () => {
    const seed = createSeedData();
    const worn = ensureStarterCosmetics({
      ...seed,
      equippedItems: {
        ...seed.equippedItems,
        avatarItemId: "avatar_knight",
        frameItemId: null,
      },
      shopItems: seed.shopItems.map((item) =>
        item.id === "avatar_knight" ? { ...item, owned: true } : item,
      ),
    });
    assert.equal(worn.equippedItems.avatarItemId, "avatar_knight");
    assert.equal(worn.equippedItems.frameItemId, "frame_default");
  });

  it("refuses to clear a slot", () => {
    const data = createSeedData();
    const result = applyUnequipShopItem(data, "avatar");
    assert.equal(result.ok, false);
    assert.equal(data.equippedItems.avatarItemId, "avatar_default");
  });
});

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
