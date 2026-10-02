import type { AuthUser } from "~/lib/auth/session-types";
import type { UserRole } from "~/lib/auth/session-types";
import type { ClaimActionResult, SettingsActionResult } from "~/lib/v1/claims";
import type { HabitActionResult, HabitBatchActionResult, HabitCrudActionResult } from "~/lib/v1/habits";
import type { AuthCommandResult } from "~/lib/v1/identity";
import type {
  BlockedPerson,
  FriendActivityItem,
  FriendCard,
  FriendLookupPreview,
  FriendProfileView,
  FriendRequestCard,
} from "~/lib/v1/friend-rules";
import type { LevelLeaderboardEntry } from "~/lib/v1/leaderboard";
import type { PushSubscribeResult, PushTestResult } from "~/lib/v1/push";
import type { ShopEquipResult, ShopPurchaseResult } from "~/lib/v1/shop";
import type { SettleSessionResult } from "~/lib/v1/settle";
import type {
  BootSessionResult,
  PullSaveResult,
  PushSaveResult,
} from "~/lib/v1/sync";
import type { HabitFormValues, HabitQuestData, ShopCategory, UserSettings, CompletionReflectionRecord, HabitCompletion, StarterHabitKey } from "~/types/habitquest";
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
  const result = await v1Request<{ signedOut: boolean }>("/auth/sign-out", {
    method: "POST",
  });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
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

export async function changePasswordRequest(
  currentPassword: string,
  nextPassword: string,
): Promise<AuthCommandResult> {
  const result = await v1Request<{ user: AuthUser }>("/auth/change-password", {
    json: { currentPassword, nextPassword },
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, user: result.data.user };
}

export async function completeHabitRequest(
  habitId: string,
  dateKey: string,
  minimum = false,
): Promise<HabitActionResult> {
  return asCommand<HabitActionResult>(
    await v1Request(`/habits/${encodeURIComponent(habitId)}/complete`, {
      json: { dateKey, ...(minimum ? { minimum: true } : {}) },
    }),
  );
}

export async function completeHabitsRequest(
  habitIds: string[],
  dateKey: string,
  minimumHabitIds: string[] = [],
): Promise<HabitBatchActionResult> {
  return asCommand<HabitBatchActionResult>(
    await v1Request("/habits/complete-batch", {
      json: {
        habitIds,
        dateKey,
        ...(minimumHabitIds.length ? { minimumHabitIds } : {}),
      },
    }),
  );
}

export async function uncompleteHabitRequest(habitId: string, dateKey: string): Promise<HabitActionResult> {
  return asCommand<HabitActionResult>(
    await v1Request("/habits/uncomplete", {
      json: { habitId, dateKey },
    }),
  );
}

export async function recordReflectionRequest(
  habitId: string,
  dateKey: string,
  reflection: CompletionReflectionRecord,
): Promise<
  | { status: "ok"; habitId: string; date: string; completion: HabitCompletion }
  | { status: "unauthenticated" }
  | { status: "error"; error: string }
> {
  return asCommand(
    await v1Request(`/habits/${encodeURIComponent(habitId)}/reflection`, {
      json: { dateKey, reflection },
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

export async function completeOnboardingRequest(
  displayName: string,
  starterKeys?: StarterHabitKey[],
): Promise<SettingsActionResult> {
  return asCommand<SettingsActionResult>(
    await v1Request("/onboarding", {
      json: starterKeys ? { displayName, starterKeys } : { displayName },
    }),
  );
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

export async function claimAllRewardsRequest(kinds?: string[]): Promise<ClaimActionResult> {
  return asCommand<ClaimActionResult>(
    await v1Request("/claims/all", {
      json: kinds?.length ? { kinds } : {},
    }),
  );
}

export async function buyStreakFreezeRequest(): Promise<ClaimActionResult> {
  return asCommand<ClaimActionResult>(await v1Request("/claims/streak-freeze", { method: "POST" }));
}

export async function settleSessionRequest(): Promise<SettleSessionResult> {
  return asCommand<SettleSessionResult>(await v1Request("/session/settle", { method: "POST" }));
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

export async function getFriendProfileRequest(userId: string) {
  const result = await v1Request<{ profile: FriendProfileView }>(
    `/friends/${encodeURIComponent(userId)}/profile`,
  );
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, profile: result.data.profile };
}

export async function getIncomingFriendRequestCountRequest() {
  const result = await v1Request<{ count: number }>("/friends/requests/count");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, count: result.data.count };
}

export async function getFriendInboxRequest() {
  const result = await v1Request<{
    nudge: { fromUserId: string; localDate: string; title: string; body: string } | null;
    request: { fromUserId: string; title: string; body: string } | null;
    accept: { fromUserId: string; title: string; body: string } | null;
    finish: { fromUserId: string; title: string; body: string } | null;
    streak: { fromUserId: string; streak: number; title: string; body: string } | null;
    cheer: { fromUserId: string; title: string; body: string } | null;
  }>("/friends/inbox");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, ...result.data };
}

export async function getFriendsRequest() {
  const result = await v1Request<{
    uid: string;
    friends: FriendCard[];
    requests: FriendRequestCard[];
    blocked: BlockedPerson[];
    activity: FriendActivityItem[];
  }>("/friends");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, ...result.data };
}

export async function lookupFriendRequest(query: string) {
  const result = await v1Request<{ previews: FriendLookupPreview[] }>("/friends/lookup", {
    json: { query },
  });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, previews: result.data.previews };
}

export async function sendFriendRequest(uid: string) {
  const result = await v1Request<{
    uid: string;
    friends: FriendCard[];
    requests: FriendRequestCard[];
    blocked: BlockedPerson[];
    activity: FriendActivityItem[];
    delivery: "push" | "in-app";
  }>("/friends/requests", { json: { uid } });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, ...result.data };
}

export async function acceptFriendRequest(requestId: string) {
  return getFriendsRequestResult(`/friends/requests/${encodeURIComponent(requestId)}/accept`);
}

export async function declineFriendRequest(requestId: string) {
  return getFriendsRequestResult(`/friends/requests/${encodeURIComponent(requestId)}`, {
    method: "DELETE",
  });
}

export async function removeFriendRequest(userId: string) {
  return getFriendsRequestResult(`/friends/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

export async function blockFriendRequest(userId: string) {
  return getFriendsRequestResult(`/friends/${encodeURIComponent(userId)}/block`, { method: "POST" });
}

export async function unblockFriendRequest(userId: string) {
  return getFriendsRequestResult(`/friends/${encodeURIComponent(userId)}/unblock`, { method: "POST" });
}

export async function cheerFriendRequest(userId: string) {
  const result = await v1Request<{ cheer: "sent"; delivery: "push" | "in-app" }>(
    `/friends/${encodeURIComponent(userId)}/cheer`,
    { method: "POST" },
  );
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, cheer: result.data.cheer, delivery: result.data.delivery };
}

export async function markActivitySeenRequest() {
  const result = await v1Request("/friends/activity/seen", { method: "POST" });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

export async function markCheerNoticeSeenRequest(fromUserId: string) {
  const result = await v1Request("/friends/cheers/seen", { json: { fromUserId } });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

export async function nudgeFriendRequest(userId: string) {
  const result = await v1Request<{ nudge: "sent"; delivery: "push" | "in-app" }>(
    `/friends/${encodeURIComponent(userId)}/nudge`,
    { method: "POST" },
  );
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, nudge: result.data.nudge, delivery: result.data.delivery };
}

export async function getIncomingNudgesRequest() {
  const result = await v1Request<{
    nudges: Array<{ fromUserId: string; localDate: string; title: string; body: string }>;
  }>("/friends/nudges");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, nudges: result.data.nudges };
}

export async function getIncomingFriendRequestAlertsRequest() {
  const result = await v1Request<{
    requests: Array<{ fromUserId: string; title: string; body: string }>;
  }>("/friends/requests/alerts");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, requests: result.data.requests };
}

export async function getIncomingStreakNoticesRequest() {
  const result = await v1Request<{
    streaks: Array<{ fromUserId: string; streak: number; title: string; body: string }>;
  }>("/friends/streaks");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, streaks: result.data.streaks };
}

export async function markStreakNoticeSeenRequest(fromUserId: string, streak: number) {
  const result = await v1Request("/friends/streaks/seen", { json: { fromUserId, streak } });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

export async function getIncomingAcceptNoticesRequest() {
  const result = await v1Request<{
    accepts: Array<{ fromUserId: string; title: string; body: string }>;
  }>("/friends/accepts");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, accepts: result.data.accepts };
}

export async function markAcceptNoticeSeenRequest(fromUserId: string) {
  const result = await v1Request("/friends/accepts/seen", { json: { fromUserId } });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

export async function getIncomingFinishNoticesRequest() {
  const result = await v1Request<{
    finishes: Array<{ fromUserId: string; title: string; body: string }>;
  }>("/friends/finishes");
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, finishes: result.data.finishes };
}

export async function markFinishNoticeSeenRequest(fromUserId: string) {
  const result = await v1Request("/friends/finishes/seen", { json: { fromUserId } });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

export async function markFriendRequestAlertSeenRequest(fromUserId: string) {
  const result = await v1Request("/friends/requests/alerts/seen", { json: { fromUserId } });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

export async function markNudgeSeenRequest(fromUserId: string) {
  const result = await v1Request("/friends/nudges/seen", { json: { fromUserId } });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const };
}

async function getFriendsRequestResult(
  path: string,
  init: { method?: string; uid?: string } = {},
) {
  const result = await v1Request<{
    uid: string;
    friends: FriendCard[];
    requests: FriendRequestCard[];
    blocked: BlockedPerson[];
    activity: FriendActivityItem[];
  }>(path, {
    method: init.method,
    json: init.uid !== undefined ? { uid: init.uid } : init.method === "DELETE" ? undefined : {},
  });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, ...result.data };
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
    return { status: "error", user: { id: "", email: "", displayName: "", uid: "", role: "user" }, error: result.error };
  }
  return result.data;
}

export async function syncHabitQuestOnAuthRequest(
  localPayload: unknown,
  options: { extractLocal?: boolean; discardGuest?: boolean } = {},
) {
  const result = await v1Request<{
    status: "loaded";
    data: HabitQuestData;
    source: "cloud" | "local-migrated" | "local-extracted";
    updatedAt: string;
    extracted: boolean;
  }>("/saves/sync", {
    json: {
      localPayload,
      extractLocal: options.extractLocal,
      discardGuest: options.discardGuest,
    },
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
