"use client";

import { requestReminderPermission } from "~/lib/habitquest/reminders";
import {
  canUseWebPush,
  getVapidPublicKeyFromEnv,
  subscribeToHabitQuestPush,
  unsubscribeFromHabitQuestPush,
} from "~/lib/push/client";
import { describePushReminderSchedule } from "~/lib/push/timezone";
import {
  removePushSubscriptionRequest,
  savePushSubscriptionRequest,
} from "~/lib/v1/requests";
import { useHabitQuestStore } from "~/store/habitquest-store";

export type EnableRemindersResult = {
  permission: "granted" | "denied" | "unsupported" | "default";
  pushStatus:
    | "subscribed"
    | "skipped"
    | "push_service_error"
    | "missing-vapid"
    | "unsupported"
    | "error";
  message: string;
};

/**
 * Ask for notification permission, turn reminders on, and best-effort subscribe to Web Push.
 * Safe when Chrome blocks push — local permission + remindersEnabled still succeed.
 */
export async function enableHabitQuestReminders(): Promise<EnableRemindersResult> {
  const updateSettings = useHabitQuestStore.getState().updateSettings;
  const permission = await requestReminderPermission();

  if (permission === "unsupported") {
    return {
      permission,
      pushStatus: "unsupported",
      message: "This browser cannot show notifications.",
    };
  }

  if (permission !== "granted") {
    updateSettings({ remindersEnabled: false });
    return {
      permission,
      pushStatus: "skipped",
      message: "Reminders stay off. You can allow them later in Settings.",
    };
  }

  const currentTime = useHabitQuestStore.getState().settings.reminderTime;
  updateSettings({
    remindersEnabled: true,
  });

  const schedule = describePushReminderSchedule(currentTime);

  if (!canUseWebPush() || !getVapidPublicKeyFromEnv()) {
    return {
      permission: "granted",
      pushStatus: getVapidPublicKeyFromEnv() ? "unsupported" : "missing-vapid",
      message: `We'll ping you ${schedule}. Background push needs a push-capable browser.`,
    };
  }

  const subscribed = await subscribeToHabitQuestPush();
  if (subscribed.status === "subscribed" && subscribed.subscription?.endpoint) {
    const saved = await savePushSubscriptionRequest(
      {
        endpoint: subscribed.subscription.endpoint,
        keys: {
          p256dh: subscribed.subscription.keys?.p256dh,
          auth: subscribed.subscription.keys?.auth,
        },
      },
      subscribed.timeZone,
    );
    if (saved.status === "ok") {
      return {
        permission: "granted",
        pushStatus: "subscribed",
        message: `Reminders on — ${schedule}.`,
      };
    }
    return {
      permission: "granted",
      pushStatus: "error",
      message: `Permission is on, but push could not be saved: ${saved.status === "error" || saved.status === "not_configured" ? saved.error : "unknown error"}.`,
    };
  }

  if (subscribed.status === "push_service_error") {
    return {
      permission: "granted",
      pushStatus: "push_service_error",
      message: `Permission is on for this device. Background push is blocked (${subscribed.error}).`,
    };
  }

  return {
    permission: "granted",
    pushStatus: "skipped",
    message: `We'll ping you ${schedule}.`,
  };
}

export async function disableHabitQuestReminders() {
  const updateSettings = useHabitQuestStore.getState().updateSettings;
  updateSettings({ remindersEnabled: false });
  const result = await unsubscribeFromHabitQuestPush();
  if (result.endpoint) {
    await removePushSubscriptionRequest(result.endpoint);
  }
}
