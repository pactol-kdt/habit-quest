import "server-only";

import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
};

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
}

function getVapidPrivateKey() {
  return process.env.VAPID_PRIVATE_KEY?.trim() || "";
}

function getVapidSubject() {
  return process.env.VAPID_SUBJECT?.trim() || "mailto:habitquest@localhost";
}

export function isWebPushConfigured() {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey());
}

export function configureWebPush() {
  if (!isWebPushConfigured()) {
    throw new Error(
      "Web Push is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
    );
  }

  webpush.setVapidDetails(getVapidSubject(), getVapidPublicKey(), getVapidPrivateKey());
  return webpush;
}

export async function sendWebPush(
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: PushPayload,
) {
  const client = configureWebPush();
  await client.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60 * 60 * 12,
  });
}
