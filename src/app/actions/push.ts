"use server";

import { eq } from "drizzle-orm";
import { getCurrentUser } from "~/lib/auth/session";
import { ensureDatabase } from "~/lib/db";
import { pushSubscriptions, userSettings } from "~/lib/db/schema";
import { sendTestPushToUser } from "~/lib/push/reminders-dispatch";
import { getVapidPublicKey, isWebPushConfigured } from "~/lib/push/web-push";

type PushActionOk = { status: "ok" };
type PushActionUnauth = { status: "unauthenticated" };
type PushActionError = { status: "error"; error: string };
type PushActionConfig = { status: "not_configured"; error: string };

export type PushSubscribeResult =
  | PushActionOk
  | PushActionUnauth
  | PushActionError
  | PushActionConfig;

export type PushTestResult =
  | { status: "ok"; sent: number; failed: number }
  | PushActionUnauth
  | PushActionError
  | PushActionConfig;

type PushSubscriptionPayload = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
  expirationTime?: number | null;
};

function validateSubscription(input: PushSubscriptionPayload) {
  const endpoint = input.endpoint?.trim();
  const p256dh = input.keys?.p256dh?.trim();
  const auth = input.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return null;
  }
  return { endpoint, p256dh, auth };
}

export async function getPushConfigAction() {
  return {
    configured: isWebPushConfigured(),
    publicKey: getVapidPublicKey(),
  };
}

export async function savePushSubscriptionAction(
  subscription: PushSubscriptionPayload,
  timeZone?: string,
): Promise<PushSubscribeResult> {
  try {
    if (!isWebPushConfigured()) {
      return {
        status: "not_configured",
        error: "Push is not configured on the server (missing VAPID keys).",
      };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const parsed = validateSubscription(subscription);
    if (!parsed) {
      return { status: "error", error: "Invalid push subscription payload." };
    }

    const database = await ensureDatabase();
    const now = new Date().toISOString();
    const tz =
      typeof timeZone === "string" && timeZone.trim().length > 0
        ? timeZone.trim().slice(0, 64)
        : "UTC";

    await database
      .insert(pushSubscriptions)
      .values({
        endpoint: parsed.endpoint,
        userId: user.id,
        p256dh: parsed.p256dh,
        auth: parsed.auth,
        userAgent: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: user.id,
          p256dh: parsed.p256dh,
          auth: parsed.auth,
          updatedAt: now,
        },
      });

    await database
      .update(userSettings)
      .set({ reminderTimezone: tz })
      .where(eq(userSettings.userId, user.id));

    return { status: "ok" };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to save push subscription.",
    };
  }
}

export async function removePushSubscriptionAction(
  endpoint?: string | null,
): Promise<PushSubscribeResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    if (endpoint?.trim()) {
      await database
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, endpoint.trim()));
    } else {
      await database
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, user.id));
    }

    return { status: "ok" };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to remove push subscription.",
    };
  }
}

export async function sendTestPushAction(): Promise<PushTestResult> {
  try {
    if (!isWebPushConfigured()) {
      return {
        status: "not_configured",
        error: "Push is not configured on the server (missing VAPID keys).",
      };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { status: "unauthenticated" };
    }

    const database = await ensureDatabase();
    const settings = await database
      .select({ displayName: userSettings.displayName })
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .limit(1);

    const displayName = settings[0]?.displayName || user.displayName || "Adventurer";
    const result = await sendTestPushToUser(database, user.id, displayName);

    if (result.error && result.sent === 0) {
      return { status: "error", error: result.error };
    }

    return { status: "ok", sent: result.sent, failed: result.failed };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Failed to send test push.",
    };
  }
}
