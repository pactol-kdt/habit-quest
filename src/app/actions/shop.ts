"use server";

import {
  equipShopItemAction as equipShopItem,
  purchaseShopItemAction as purchaseShopItem,
  unequipShopItemAction as unequipShopItem,
} from "~/lib/v1/shop";
import type { ShopCategory } from "~/types/habitquest";

export type { ShopEquipResult, ShopPurchaseResult } from "~/lib/v1/shop";

export async function purchaseShopItemAction(itemId: string) {
  return purchaseShopItem(itemId);
}

export async function equipShopItemAction(itemId: string) {
  return equipShopItem(itemId);
}

export async function unequipShopItemAction(category: ShopCategory) {
  return unequipShopItem(category);
}
