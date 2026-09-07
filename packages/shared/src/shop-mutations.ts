import { isFeatureUnlocked } from "./utils";
import type {
  CoinWallet,
  EquippedItems,
  HabitQuestData,
  ShopCategory,
  ShopItem,
} from "./types";

export type ShopMutationResult =
  | {
      ok: true;
      data: HabitQuestData;
      itemId: string;
      wallet: CoinWallet;
      equippedItems: EquippedItems;
    }
  | { ok: false; error: string };

/**
 * Purchasable ladder per category (price → level → id).
 * Exclusive challenge/quest/season grants sit outside the chain and never
 * gate (or get gated by) the buyable tiers.
 */
export function getPurchasableLadder(
  shopItems: ShopItem[],
  category: ShopCategory,
): ShopItem[] {
  return shopItems
    .filter((item) => item.category === category && !item.exclusive)
    .slice()
    .sort(
      (a, b) =>
        a.price - b.price ||
        a.requiredLevel - b.requiredLevel ||
        a.id.localeCompare(b.id),
    );
}

export function getShopLadderPrerequisite(
  shopItems: ShopItem[],
  item: ShopItem,
): ShopItem | null {
  if (item.exclusive) {
    return null;
  }
  const ladder = getPurchasableLadder(shopItems, item.category);
  const index = ladder.findIndex((entry) => entry.id === item.id);
  if (index <= 0) {
    return null;
  }
  // Require every earlier purchasable tier — owning a mid/high tier without
  // lower ones does not let you skip ahead (e.g. own T3, missing T1–T2 → buy T4 blocked).
  for (let i = 0; i < index; i += 1) {
    const earlier = ladder[i];
    if (earlier && !earlier.owned) {
      return earlier;
    }
  }
  return null;
}

/** Short UI / mutation reason when an earlier purchasable tier is missing. */
export function getShopLadderLockReason(
  shopItems: ShopItem[],
  item: ShopItem,
): string | null {
  const prerequisite = getShopLadderPrerequisite(shopItems, item);
  if (!prerequisite) {
    return null;
  }
  return `Own ${prerequisite.name} first`;
}

function spendCoins(data: HabitQuestData, amount: number) {
  data.wallet = {
    ...data.wallet,
    totalCoins: data.wallet.totalCoins - amount,
    lifetimeCoinsSpent: data.wallet.lifetimeCoinsSpent + amount,
  };
}

export function equippedPatchForCategory(
  equippedItems: EquippedItems,
  category: ShopCategory,
  itemId: string | null,
): EquippedItems {
  if (category === "title") {
    return { ...equippedItems, titleItemId: itemId };
  }
  if (category === "frame") {
    return { ...equippedItems, frameItemId: itemId };
  }
  if (category === "avatar") {
    return { ...equippedItems, avatarItemId: itemId };
  }
  return { ...equippedItems, themeItemId: itemId };
}

export function applyPurchaseShopItem(
  data: HabitQuestData,
  itemId: string,
): ShopMutationResult {
  const item = data.shopItems.find((entry) => entry.id === itemId);
  if (!item) {
    return { ok: false, error: "Shop item not found." };
  }
  if (item.owned) {
    return { ok: false, error: "Already owned." };
  }
  if (item.exclusive) {
    return { ok: false, error: "Exclusive item — earn it through gameplay." };
  }
  const ladderLock = getShopLadderLockReason(data.shopItems, item);
  if (ladderLock) {
    return { ok: false, error: ladderLock };
  }
  if (item.requiredFeature && !isFeatureUnlocked(data.levelUnlocks, item.requiredFeature)) {
    return { ok: false, error: `Requires ${item.requiredFeature}.` };
  }
  if (data.userProgress.level < item.requiredLevel) {
    return { ok: false, error: `Unlocks at level ${item.requiredLevel}.` };
  }
  if (data.wallet.totalCoins < item.price) {
    return { ok: false, error: "Not enough coins." };
  }

  const next: HabitQuestData = {
    ...data,
    shopItems: data.shopItems.map((entry) =>
      entry.id === itemId ? { ...entry, owned: true } : entry,
    ),
    wallet: { ...data.wallet },
    equippedItems: { ...data.equippedItems },
  };
  spendCoins(next, item.price);

  return {
    ok: true,
    data: next,
    itemId,
    wallet: next.wallet,
    equippedItems: next.equippedItems,
  };
}

export function applyEquipShopItem(
  data: HabitQuestData,
  itemId: string,
): ShopMutationResult {
  const item = data.shopItems.find((entry) => entry.id === itemId);
  if (!item || !item.owned) {
    return { ok: false, error: "Item not owned." };
  }
  if (item.requiredFeature && !isFeatureUnlocked(data.levelUnlocks, item.requiredFeature)) {
    return { ok: false, error: "Feature still locked." };
  }

  const equippedItems = equippedPatchForCategory(data.equippedItems, item.category, item.id);
  const next: HabitQuestData = {
    ...data,
    equippedItems,
  };

  return {
    ok: true,
    data: next,
    itemId,
    wallet: next.wallet,
    equippedItems,
  };
}

export function applyUnequipShopItem(
  data: HabitQuestData,
  category: ShopCategory,
): ShopMutationResult {
  const equippedItems = equippedPatchForCategory(data.equippedItems, category, null);
  const next: HabitQuestData = {
    ...data,
    equippedItems,
  };

  return {
    ok: true,
    data: next,
    itemId: category,
    wallet: next.wallet,
    equippedItems,
  };
}
