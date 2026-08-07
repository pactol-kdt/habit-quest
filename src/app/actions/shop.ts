"use server";

import { getCurrentUser } from "~/lib/auth/session";
import { ensureDatabase } from "~/lib/db";
import { loadCatalogFromDb } from "~/lib/db/catalog-repository";
import {
  loadNormalizedSave,
  persistEquippedCosmetics,
  persistShopPurchase,
} from "~/lib/db/habitquest-repository";
import {
  applyEquipShopItem,
  applyPurchaseShopItem,
  applyUnequipShopItem,
} from "~/lib/habitquest/shop-mutations";
import type { CoinWallet, EquippedItems, ShopCategory } from "~/types/habitquest";

export type ShopPurchaseResult =
  | {
      status: "ok";
      itemId: string;
      wallet: CoinWallet;
      updatedAt: string;
    }
  | { status: "unauthenticated" }
  | { status: "error"; error: string };

export type ShopEquipResult =
  | {
      status: "ok";
      itemId: string;
      equippedItems: EquippedItems;
      updatedAt: string;
    }
  | { status: "unauthenticated" }
  | { status: "error"; error: string };

const SHOP_CATEGORIES: ShopCategory[] = ["title", "frame", "avatar", "theme"];

function isShopCategory(value: string): value is ShopCategory {
  return (SHOP_CATEGORIES as string[]).includes(value);
}

/**
 * Buy a catalog shop item. Client sends itemId only — server validates coins/ownership.
 */
export async function purchaseShopItemAction(itemId: string): Promise<ShopPurchaseResult> {
  try {
    if (!itemId || typeof itemId !== "string") {
      return { status: "error", error: "itemId is required." };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return { status: "error", error: "No cloud save found." };
    }

    const mutation = applyPurchaseShopItem(existing.data, itemId);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const saved = await persistShopPurchase(
      database,
      user.id,
      itemId,
      mutation.wallet,
    );

    return {
      status: "ok",
      itemId,
      wallet: saved.wallet,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to purchase item.";
    if (/duplicate|owned_shop|PRIMARY/i.test(message)) {
      return { status: "error", error: "Already owned." };
    }
    return { status: "error", error: message };
  }
}

/**
 * Equip an owned cosmetic. Client sends itemId only.
 */
export async function equipShopItemAction(itemId: string): Promise<ShopEquipResult> {
  try {
    if (!itemId || typeof itemId !== "string") {
      return { status: "error", error: "itemId is required." };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return { status: "error", error: "No cloud save found." };
    }

    const mutation = applyEquipShopItem(existing.data, itemId);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const saved = await persistEquippedCosmetics(
      database,
      user.id,
      mutation.equippedItems,
    );

    return {
      status: "ok",
      itemId,
      equippedItems: saved.equippedItems,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to equip item.";
    return { status: "error", error: message };
  }
}

/**
 * Clear an equip slot. Client sends category only.
 */
export async function unequipShopItemAction(
  category: ShopCategory,
): Promise<ShopEquipResult> {
  try {
    if (!isShopCategory(category)) {
      return { status: "error", error: "Invalid shop category." };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    const catalog = await loadCatalogFromDb(database);
    const existing = await loadNormalizedSave(database, user.id, catalog);
    if (!existing) {
      return { status: "error", error: "No cloud save found." };
    }

    const mutation = applyUnequipShopItem(existing.data, category);
    if (!mutation.ok) {
      return { status: "error", error: mutation.error };
    }

    const saved = await persistEquippedCosmetics(
      database,
      user.id,
      mutation.equippedItems,
    );

    return {
      status: "ok",
      itemId: category,
      equippedItems: saved.equippedItems,
      updatedAt: saved.updatedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unequip item.";
    return { status: "error", error: message };
  }
}
