"use server";

import {
  getPushConfigAction as getPushConfig,
  removePushSubscriptionAction as removePushSubscription,
  savePushSubscriptionAction as savePushSubscription,
  sendTestPushAction as sendTestPush,
} from "~/lib/v1/push";

export type { PushSubscribeResult, PushTestResult } from "~/lib/v1/push";

export async function getPushConfigAction() {
  return getPushConfig();
}

export async function savePushSubscriptionAction(
  subscription: { endpoint: string; keys?: { p256dh?: string; auth?: string }; expirationTime?: number | null },
  timeZone?: string,
) {
  return savePushSubscription(subscription, timeZone);
}

export async function removePushSubscriptionAction(endpoint?: string | null) {
  return removePushSubscription(endpoint);
}

export async function sendTestPushAction() {
  return sendTestPush();
}
