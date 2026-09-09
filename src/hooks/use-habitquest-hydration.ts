"use client";

import { useEffect, useRef } from "react";
import { bootHabitQuestSessionRequest } from "~/lib/v1/requests";
import { flushCloudSaveNow, setCloudSyncEnabled } from "~/lib/habitquest/cloud-sync";
import { createSeedData } from "~/lib/habitquest/seed";
import {
  mergeCloudSaveWithLocalDraft,
  peekCachedAuthUser,
  peekHabitQuestLocalSave,
  isGuestPlayEnabled,
} from "~/lib/habitquest/storage";
import { useHabitQuestStore } from "~/store/habitquest-store";

export function useHabitQuestHydration() {
  const setAuthChecked = useHabitQuestStore((state) => state.setAuthChecked);
  const setAuthUser = useHabitQuestStore((state) => state.setAuthUser);
  const applyAuthenticatedSave = useHabitQuestStore((state) => state.applyAuthenticatedSave);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) {
      return;
    }
    booted.current = true;

    void (async () => {
      const localSave = peekHabitQuestLocalSave();
      const cachedUser = peekCachedAuthUser();

      // Optimistic first paint: show cached save immediately. Do NOT enable cloud
      // sync yet — a premature push could overwrite a newer cloud save.
      const paintedOptimistic = Boolean(localSave && cachedUser);
      if (localSave && cachedUser) {
        setAuthUser(cachedUser);
        applyAuthenticatedSave(localSave, {
          processDailyLogin: false,
        });
      }

      const boot = await bootHabitQuestSessionRequest(localSave ?? createSeedData(), {
        // Session restore never overwrites an existing cloud save.
        // Empty accounts still migrate leftover local progress, then clear it.
        extractLocal: false,
      });

      if (boot.status === "guest") {
        setCloudSyncEnabled(false);
        setAuthUser(null);
        if (isGuestPlayEnabled()) {
          useHabitQuestStore.getState().startGuestPlay();
        }
        setAuthChecked(true);
        return;
      }

      setAuthUser(boot.user);
      setCloudSyncEnabled(true);

      if (boot.status === "loaded") {
        // Prefer the live store draft so edits during optimistic paint survive merge.
        const draft =
          paintedOptimistic
            ? useHabitQuestStore.getState().projectSave()
            : localSave;
        const merged = mergeCloudSaveWithLocalDraft(boot.data, draft);
        applyAuthenticatedSave(merged.data, {
          processDailyLogin: true,
        });
        // Flush the *resolved* payload already scheduled by applyAuthenticatedSave —
        // never push the pre-resolve merge.
        if (merged.shouldPush) {
          void flushCloudSaveNow();
        }
        setAuthChecked(true);
        return;
      }

      // Keep the session on sync errors — fall back to local cache when possible.
      if (localSave) {
        applyAuthenticatedSave(localSave, {
          processDailyLogin: true,
        });
        setAuthChecked(true);
        return;
      }

      // Sync error with no local cache: stay signed in, show empty boot via checked flag.
      setAuthChecked(true);
    })();
  }, [applyAuthenticatedSave, setAuthChecked, setAuthUser]);
}
