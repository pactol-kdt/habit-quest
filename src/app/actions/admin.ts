"use server";

import { eq } from "drizzle-orm";
import { getCurrentUser } from "~/lib/auth/session";
import type { UserRole } from "~/lib/auth/session-types";
import { createId } from "~/lib/habitquest/utils";
import { ensureDatabase } from "~/lib/db";
import {
  loadCatalogFromDb,
  replaceCatalog,
  upsertCatalogAchievement,
  upsertCatalogShopItem,
} from "~/lib/db/catalog-repository";
import { getBuiltinCatalog } from "~/lib/habitquest/catalog";
import { catalogAchievements, catalogShopItems, users } from "~/lib/db/schema";
import type { Achievement, ShopItem } from "~/types/habitquest";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}

export async function listAdminUsersAction() {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Admin access required." };
  }

  const database = await ensureDatabase();
  const rows = await database
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users);

  return {
    ok: true as const,
    users: rows.map((row) => ({
      ...row,
      role: (row.role === "admin" ? "admin" : "user") as UserRole,
    })),
  };
}

export async function setUserRoleAction(userId: string, role: UserRole) {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Admin access required." };
  }

  if (role !== "admin" && role !== "user") {
    return { ok: false as const, error: "Invalid role." };
  }

  if (admin.id === userId && role !== "admin") {
    return { ok: false as const, error: "You cannot remove your own admin role." };
  }

  const database = await ensureDatabase();
  await database
    .update(users)
    .set({ role, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId));

  return { ok: true as const };
}

export async function listCatalogShopItemsAction() {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Admin access required." };
  }

  const database = await ensureDatabase();
  const rows = await database.select().from(catalogShopItems);
  return { ok: true as const, items: rows };
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
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Admin access required." };
  }

  if (!input.id.trim() || !input.name.trim()) {
    return { ok: false as const, error: "Id and name are required." };
  }

  const database = await ensureDatabase();
  await upsertCatalogShopItem(database, {
    id: input.id.trim(),
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category,
    rarity: input.rarity,
    price: Number(input.price) || 0,
    requiredLevel: Number(input.requiredLevel) || 1,
    requiredFeature: input.requiredFeature,
    preview: input.preview.trim() || input.name.trim().slice(0, 2),
    exclusive: Boolean(input.exclusive),
    active: Boolean(input.active),
  });

  return { ok: true as const };
}

export async function listCatalogAchievementsAction() {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Admin access required." };
  }

  const database = await ensureDatabase();
  const rows = await database.select().from(catalogAchievements);
  return { ok: true as const, achievements: rows };
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
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Admin access required." };
  }

  if (!input.key.trim() || !input.title.trim()) {
    return { ok: false as const, error: "Key and title are required." };
  }

  const database = await ensureDatabase();
  await upsertCatalogAchievement(database, {
    id: createId("achievement"),
    key: input.key.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    icon: input.icon.trim() || "Star",
    reward: {
      coins: Number(input.rewardCoins) || 0,
      exp: Number(input.rewardExp) || 0,
    },
    active: Boolean(input.active),
  });

  return { ok: true as const };
}

export async function resetCatalogFromBuiltinAction() {
  const admin = await requireAdmin();
  if (!admin) {
    return { ok: false as const, error: "Admin access required." };
  }

  const database = await ensureDatabase();
  await replaceCatalog(database, getBuiltinCatalog());
  const catalog = await loadCatalogFromDb(database);
  return {
    ok: true as const,
    counts: {
      shopItems: catalog.shopItems.length,
      achievements: catalog.achievements.length,
    },
  };
}
