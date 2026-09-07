"use server";

import {
  listAdminUsersAction as listAdminUsers,
  listCatalogAchievementsAction as listCatalogAchievements,
  listCatalogShopItemsAction as listCatalogShopItems,
  resetCatalogFromBuiltinAction as resetCatalogFromBuiltin,
  saveCatalogAchievementAction as saveCatalogAchievement,
  saveCatalogShopItemAction as saveCatalogShopItem,
  setUserRoleAction as setUserRole,
} from "~/lib/v1/admin";
import type { UserRole } from "~/lib/auth/session-types";
import type { Achievement, ShopItem } from "~/types/habitquest";

export async function listAdminUsersAction() {
  return listAdminUsers();
}

export async function setUserRoleAction(userId: string, role: UserRole) {
  return setUserRole(userId, role);
}

export async function listCatalogShopItemsAction() {
  return listCatalogShopItems();
}

export async function saveCatalogShopItemAction(input: {
  id: string;
  name: string;
  description: string;
  category: ShopItem["category"];
  rarity: ShopItem["rarity"];
  price: number;
  requiredLevel: number;
  requiredFeature: ShopItem["requiredFeature"];
  preview: string;
  exclusive: boolean;
  active: boolean;
}) {
  return saveCatalogShopItem(input);
}

export async function listCatalogAchievementsAction() {
  return listCatalogAchievements();
}

export async function saveCatalogAchievementAction(input: {
  key: string;
  title: string;
  description: string;
  category: Achievement["category"];
  icon: string;
  rewardCoins: number;
  rewardExp: number;
  active: boolean;
}) {
  return saveCatalogAchievement(input);
}

export async function resetCatalogFromBuiltinAction() {
  return resetCatalogFromBuiltin();
}
