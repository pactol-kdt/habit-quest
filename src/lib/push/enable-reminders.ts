"use client";

import {
  savePushSubscriptionAction,
} from "~/app/actions/push";
import { requestReminderPermission } from "~/lib/habitquest/reminders";
import {
  canUseWebPush,
  getVapidPublicKeyFromEnv,
  subscribeToHabitQuestPush,
} from "~/lib/push/client";
import { FIXED_REMINDER_LOCAL_TIME } from "~/lib/push/timezone";
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
      message: "This realm cannot show notifications.",
    };
  }

  if (permission !== "granted") {
    updateSettings({ remindersEnabled: false });
    return {
      permission,
      pushStatus: "skipped",
      message: "The call was declined. You can allow it later in browser settings.",
    };
  }

  updateSettings({
    remindersEnabled: true,
    reminderTime: FIXED_REMINDER_LOCAL_TIME,
  });

  if (!canUseWebPush() || !getVapidPublicKeyFromEnv()) {
    return {
      permission: "granted",
      pushStatus: getVapidPublicKeyFromEnv() ? "unsupported" : "missing-vapid",
      message:
        "We will call at dawn (~8:00 local). Background push needs a push-capable browser.",
    };
  }

  const subscribed = await subscribeToHabitQuestPush();
  if (subscribed.status === "subscribed" && subscribed.subscription?.endpoint) {
    const saved = await savePushSubscriptionAction(
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
        message: "Dawn will find you — a gentle reminder around 8:00 local time.",
      };
    }
    return {
      permission: "granted",
      pushStatus: "error",
      message: `The call was heard, but push could not be saved: ${saved.status === "error" || saved.status === "not_configured" ? saved.error : "unknown error"}.`,
    };
  }

  if (subscribed.status === "push_service_error") {
    return {
      permission: "granted",
      pushStatus: "push_service_error",
      message: `The call was heard on this device. Background push is blocked (${subscribed.error}).`,
    };
  }

  return {
    permission: "granted",
    pushStatus: "skipped",
    message: "We will call at dawn (~8:00 local).",
  };
}
