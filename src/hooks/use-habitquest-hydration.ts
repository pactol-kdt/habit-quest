"use client";

import { useEffect, useRef } from "react";
import { getSessionAction } from "~/app/actions/auth";
import { syncHabitQuestOnAuthAction } from "~/app/actions/habitquest-sync";
import { flushCloudSaveNow, setCloudSyncEnabled } from "~/lib/habitquest/cloud-sync";
import { createSeedData } from "~/lib/habitquest/seed";
import {
  mergeCloudSaveWithLocalDraft,
  peekHabitQuestLocalSave,
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
      const session = await getSessionAction();
      if (!session) {
        setCloudSyncEnabled(false);
        setAuthUser(null);
        setAuthChecked(true);
        return;
      }

      setAuthUser(session);
      setCloudSyncEnabled(true);

      const localSave = peekHabitQuestLocalSave();
      const sync = await syncHabitQuestOnAuthAction(localSave ?? createSeedData(), {
        // Session restore never overwrites an existing cloud save.
        // Empty accounts still migrate leftover local progress, then clear it.
        extractLocal: false,
      });

      if (sync.status === "loaded") {
        const merged = mergeCloudSaveWithLocalDraft(sync.data, localSave);
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
      if (sync.status === "error" && localSave) {
        applyAuthenticatedSave(localSave, {
          processDailyLogin: true,
        });
        setAuthChecked(true);
        return;
      }

      if (sync.status === "unauthenticated") {
        setCloudSyncEnabled(false);
        setAuthUser(null);
        setAuthChecked(true);
        return;
      }

      // Sync error with no local cache: stay signed in, show empty boot via checked flag.
      setAuthChecked(true);
    })();
  }, [applyAuthenticatedSave, setAuthChecked, setAuthUser]);
}
