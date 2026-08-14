"use client";

const SERVICE_WORKER_URL = "/sw.js";

export type PushClientStatus =
  | "unsupported"
  | "missing-vapid"
  | "denied"
  | "default"
  | "subscribed"
  | "unsubscribed"
  | "push_service_error";

export type PushSubscribeResult =
  | {
      status: "subscribed";
      subscription: PushSubscriptionJSON;
      timeZone: string;
    }
  | { status: "unsupported" }
  | { status: "missing-vapid" }
  | { status: "denied" }
  | { status: "default" }
  | { status: "push_service_error"; error: string };

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function describePushError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message || error.name;
    if (/push service error|AbortError|Registration failed/i.test(`${error.name} ${message}`)) {
      return "Chrome could not reach its push service (FCM). Check network/VPN/firewall, or try again on another network. Tab reminders still work.";
    }
    return message;
  }
  return "Push subscription failed.";
}

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function canUseWebPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getVapidPublicKeyFromEnv() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
}

export async function registerHabitQuestServiceWorker() {
  if (!canUseWebPush()) {
    return null;
  }
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  // Ensure an active worker before pushManager.subscribe — avoids flaky AbortErrors.
  if (registration.installing) {
    await new Promise<void>((resolve) => {
      const worker = registration.installing;
      if (!worker) {
        resolve();
        return;
      }
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated" || worker.state === "redundant") {
          resolve();
        }
      });
    });
  }
  await navigator.serviceWorker.ready;
  return registration;
}

export async function getExistingPushSubscription() {
  if (!canUseWebPush()) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

async function subscribeWithRegistration(
  registration: ServiceWorkerRegistration,
  vapidKey: string,
) {
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  } catch (firstError) {
    // Stale / half-broken subscription state — clear and retry once.
    const stale = await registration.pushManager.getSubscription();
    if (stale) {
      await stale.unsubscribe().catch(() => undefined);
    }
    try {
      return await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    } catch {
      throw firstError;
    }
  }
}

export async function subscribeToHabitQuestPush(): Promise<PushSubscribeResult> {
  if (!canUseWebPush()) {
    return { status: "unsupported" };
  }

  const vapidKey = getVapidPublicKeyFromEnv();
  if (!vapidKey) {
    return { status: "missing-vapid" };
  }

  try {
    const permission =
      Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();

    if (permission !== "granted") {
      return { status: permission === "denied" ? "denied" : "default" };
    }

    const registration = await registerHabitQuestServiceWorker();
    if (!registration) {
      return { status: "unsupported" };
    }

    const subscription = await subscribeWithRegistration(registration, vapidKey);
    return {
      status: "subscribed",
      subscription: subscription.toJSON(),
      timeZone: getBrowserTimeZone(),
    };
  } catch (error) {
    return {
      status: "push_service_error",
      error: describePushError(error),
    };
  }
}

export async function unsubscribeFromHabitQuestPush() {
  if (!canUseWebPush()) {
    return { status: "unsupported" as const, endpoint: null as string | null };
  }

  try {
    const registration = await registerHabitQuestServiceWorker();
    if (!registration) {
      return { status: "unsupported" as const, endpoint: null as string | null };
    }

    await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const endpoint = subscription?.endpoint ?? null;
    if (subscription) {
      await subscription.unsubscribe();
    }
    return { status: "unsubscribed" as const, endpoint };
  } catch {
    return { status: "unsupported" as const, endpoint: null as string | null };
  }
}

export async function getPushClientStatus(): Promise<PushClientStatus> {
  if (!canUseWebPush()) {
    return "unsupported";
  }
  if (!getVapidPublicKeyFromEnv()) {
    return "missing-vapid";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  if (Notification.permission === "default") {
    return "default";
  }
  try {
    const subscription = await getExistingPushSubscription();
    return subscription ? "subscribed" : "unsubscribed";
  } catch {
    return "push_service_error";
  }
}
