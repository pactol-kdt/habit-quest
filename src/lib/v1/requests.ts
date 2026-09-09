import type { AuthUser } from "~/lib/auth/session-types";
import type { UserRole } from "~/lib/auth/session-types";
import type { ClaimActionResult, SettingsActionResult } from "~/lib/v1/claims";
import type { HabitActionResult, HabitCrudActionResult } from "~/lib/v1/habits";
import type { AuthCommandResult } from "~/lib/v1/identity";
import type { LevelLeaderboardEntry } from "~/lib/v1/leaderboard";
import type { PushSubscribeResult, PushTestResult } from "~/lib/v1/push";
import type { ShopEquipResult, ShopPurchaseResult } from "~/lib/v1/shop";
import type {
  BootSessionResult,
  PullSaveResult,
  PushSaveResult,
} from "~/lib/v1/sync";
import type { HabitFormValues, HabitQuestData, ShopCategory, UserSettings } from "~/types/habitquest";
import { asCommand, v1Request } from "~/lib/v1/client";

export async function signInRequest(email: string, password: string): Promise<AuthCommandResult> {
  const result = await v1Request<{ user: AuthUser }>("/auth/sign-in", {
    json: { email, password },
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, user: result.data.user };
}

export async function signUpRequest(
  email: string,
  password: string,
  displayName = "",
): Promise<AuthCommandResult> {
  const result = await v1Request<{ user: AuthUser }>("/auth/sign-up", {
    json: { email, password, displayName },
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, user: result.data.user };
}

export async function signOutRequest() {
  await v1Request("/auth/sign-out", { method: "POST" });
  return { ok: true as const };
}

export async function forgotPasswordRequest(email: string) {
  const result = await v1Request<{ message: string }>("/auth/forgot-password", {
    json: { email },
  });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return {
    ok: true as const,
    message: result.data.message || "If that email has an account, we sent a reset link.",
  };
}

export async function resetPasswordRequest(token: string, password: string) {
  const result = await v1Request("/auth/reset-password", {
    json: { token, password },
  });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

export async function completeHabitRequest(habitId: string, dateKey: string): Promise<HabitActionResult> {
  return asCommand<HabitActionResult>(
    await v1Request(`/habits/${encodeURIComponent(habitId)}/complete`, {
      json: { dateKey },
    }),
  );
}

export async function uncompleteHabitRequest(habitId: string, dateKey: string): Promise<HabitActionResult> {
  return asCommand<HabitActionResult>(
    await v1Request(`/habits/${encodeURIComponent(habitId)}/uncomplete`, {
      json: { dateKey },
    }),
  );
}

export async function createHabitRequest(
  values: HabitFormValues,
  habitId?: string,
): Promise<HabitCrudActionResult> {
  return asCommand<HabitCrudActionResult>(
    await v1Request("/habits", {
      json: habitId ? { ...values, id: habitId } : values,
    }),
  );
}

export async function updateHabitRequest(
  habitId: string,
  values: HabitFormValues,
): Promise<HabitCrudActionResult> {
  return asCommand<HabitCrudActionResult>(
    await v1Request(`/habits/${encodeURIComponent(habitId)}`, {
      method: "PATCH",
      json: values,
    }),
  );
}

export async function deleteHabitRequest(habitId: string): Promise<HabitCrudActionResult> {
  return asCommand<HabitCrudActionResult>(
    await v1Request(`/habits/${encodeURIComponent(habitId)}`, { method: "DELETE" }),
  );
}

export async function purchaseShopItemRequest(itemId: string): Promise<ShopPurchaseResult> {
  return asCommand<ShopPurchaseResult>(await v1Request("/shop/purchases", { json: { itemId } }));
}

export async function equipShopItemRequest(itemId: string): Promise<ShopEquipResult> {
  return asCommand<ShopEquipResult>(await v1Request("/shop/equip", { json: { itemId } }));
}

export async function unequipShopItemRequest(category: ShopCategory): Promise<ShopEquipResult> {
  return asCommand<ShopEquipResult>(await v1Request("/shop/unequip", { json: { category } }));
}

export async function updateSettingsRequest(
  patch: Partial<UserSettings>,
): Promise<SettingsActionResult> {
  return asCommand<SettingsActionResult>(await v1Request("/settings", { method: "PATCH", json: patch }));
}

export async function completeOnboardingRequest(displayName: string): Promise<SettingsActionResult> {
  return asCommand<SettingsActionResult>(await v1Request("/onboarding", { json: { displayName } }));
}

export async function claimChallengeRewardRequest(challengeId: string): Promise<ClaimActionResult> {
  return asCommand<ClaimActionResult>(await v1Request("/claims/challenges", { json: { challengeId } }));
}

export async function claimQuestArcRewardRequest(arcId: string): Promise<ClaimActionResult> {
  return asCommand<ClaimActionResult>(await v1Request("/claims/quests", { json: { arcId } }));
}

export async function claimSeasonPassLevelRequest(level: number): Promise<ClaimActionResult> {
  return asCommand<ClaimActionResult>(await v1Request("/claims/season", { json: { level } }));
}

export async function claimBossRewardRequest(): Promise<ClaimActionResult> {
  return asCommand<ClaimActionResult>(await v1Request("/claims/boss", { method: "POST" }));
}

export async function buyStreakFreezeRequest(): Promise<ClaimActionResult> {
  return asCommand<ClaimActionResult>(await v1Request("/claims/streak-freeze", { method: "POST" }));
}

export async function getLeaderboardRequest() {
  const result = await v1Request<{
    entries: LevelLeaderboardEntry[];
    you: LevelLeaderboardEntry | null;
    totalPlayers: number;
  }>("/leaderboard");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return {
    ok: true as const,
    entries: result.data.entries,
    you: result.data.you,
    totalPlayers: result.data.totalPlayers,
  };
}

export async function bootHabitQuestSessionRequest(
  localPayload: unknown,
  options: { extractLocal?: boolean } = {},
): Promise<BootSessionResult> {
  const result = await v1Request<{
    status: "loaded";
    user: AuthUser;
    data: HabitQuestData;
    source: "cloud" | "local-migrated" | "local-extracted";
    updatedAt: string;
    extracted: boolean;
  } | { status: "guest" } | { status: "error"; user: AuthUser; error: string }>("/session/boot", {
    json: { localPayload, extractLocal: options.extractLocal },
  });
  if (!result.ok) {
    if (result.status === 401) {
      return { status: "guest" };
    }
    return { status: "error", user: { id: "", email: "", displayName: "", role: "user" }, error: result.error };
  }
  return result.data;
}

export async function syncHabitQuestOnAuthRequest(
  localPayload: unknown,
  options: { extractLocal?: boolean } = {},
) {
  const result = await v1Request<{
    status: "loaded";
    data: HabitQuestData;
    source: "cloud" | "local-migrated" | "local-extracted";
    updatedAt: string;
    extracted: boolean;
  }>("/saves/sync", {
    json: { localPayload, extractLocal: options.extractLocal },
  });
  if (result.status === 401) {
    return { status: "unauthenticated" as const };
  }
  if (!result.ok) {
    return { status: "error" as const, error: result.error };
  }
  return result.data;
}

export async function pushHabitQuestSaveRequest(payload: unknown): Promise<PushSaveResult> {
  const result = await v1Request<{
    updatedAt: string;
    version: number;
    migrated?: boolean;
  }>("/saves", { json: { payload } });
  if (result.status === 401) {
    return { status: "unauthenticated" };
  }
  if (!result.ok) {
    return result.status === 400
      ? { status: "invalid", error: result.error }
      : { status: "error", error: result.error };
  }
  return {
    status: "ok",
    updatedAt: result.data.updatedAt,
    version: result.data.version,
    migrated: result.data.migrated,
  };
}

export async function pullHabitQuestSaveRequest(): Promise<PullSaveResult> {
  const result = await v1Request<{
    status: "ok" | "empty";
    data?: HabitQuestData;
    updatedAt?: string;
    version?: number;
    userId?: string;
  }>("/saves");
  if (result.status === 401) {
    return { status: "unauthenticated" };
  }
  if (!result.ok) {
    return { status: "error", error: result.error };
  }
  if (result.data.status === "empty") {
    return { status: "empty", userId: result.data.userId ?? "" };
  }
  return {
    status: "ok",
    data: result.data.data as HabitQuestData,
    updatedAt: result.data.updatedAt as string,
    version: result.data.version as number,
  };
}

export async function getPushConfigRequest() {
  const result = await v1Request<{ configured: boolean; publicKey: string | null }>("/push/config");
  if (!result.ok) {
    return { configured: false, publicKey: null };
  }
  return result.data;
}

export async function savePushSubscriptionRequest(
  subscription: { endpoint: string; keys?: { p256dh?: string; auth?: string } },
  timeZone?: string,
): Promise<PushSubscribeResult> {
  const result = await v1Request("/push/subscriptions", {
    json: { subscription, timeZone },
  });
  if (result.status === 401) {
    return { status: "unauthenticated" };
  }
  if (result.status === 503) {
    return { status: "not_configured", error: result.ok ? "Push is not configured." : result.error };
  }
  if (!result.ok) {
    return { status: "error", error: result.error };
  }
  return { status: "ok" };
}

export async function removePushSubscriptionRequest(endpoint?: string | null): Promise<PushSubscribeResult> {
  const result = await v1Request("/push/subscriptions", {
    method: "DELETE",
    json: { endpoint },
  });
  if (result.status === 401) {
    return { status: "unauthenticated" };
  }
  if (!result.ok) {
    return { status: "error", error: result.error };
  }
  return { status: "ok" };
}

export async function sendTestPushRequest(): Promise<PushTestResult> {
  const result = await v1Request<{ sent: number; failed: number }>("/push/test", { method: "POST" });
  if (result.status === 401) {
    return { status: "unauthenticated" };
  }
  if (result.status === 503) {
    return { status: "not_configured", error: result.ok ? "Push is not configured." : result.error };
  }
  if (!result.ok) {
    return { status: "error", error: result.error };
  }
  return { status: "ok", sent: result.data.sent, failed: result.data.failed };
}

export async function listAdminUsersRequest() {
  const result = await v1Request<{
    users: Array<{ id: string; email: string; displayName: string; role: UserRole; createdAt: string }>;
  }>("/admin/users");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, users: result.data.users };
}

export async function setUserRoleRequest(userId: string, role: UserRole) {
  const result = await v1Request(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    json: { role },
  });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

export type AdminShopItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  price: number;
  requiredLevel: number;
  requiredFeature: string | null;
  preview: string;
  exclusive: boolean;
  active: boolean;
};

export type AdminAchievement = {
  key: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  rewardCoins: number;
  rewardExp: number;
  active: boolean;
};

export async function listCatalogShopItemsRequest() {
  const result = await v1Request<{ items: AdminShopItem[] }>("/admin/catalog/shop");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, items: result.data.items };
}

export async function saveCatalogShopItemRequest(input: Record<string, unknown>) {
  const result = await v1Request("/admin/catalog/shop", { method: "PUT", json: input });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

export async function listCatalogAchievementsRequest() {
  const result = await v1Request<{ achievements: AdminAchievement[] }>("/admin/catalog/achievements");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, achievements: result.data.achievements };
}

export async function saveCatalogAchievementRequest(input: Record<string, unknown>) {
  const result = await v1Request("/admin/catalog/achievements", { method: "PUT", json: input });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

export async function resetCatalogFromBuiltinRequest() {
  const result = await v1Request<{ counts: { shopItems: number; achievements: number } }>(
    "/admin/catalog/reset",
    { method: "POST" },
  );
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, counts: result.data.counts };
}
