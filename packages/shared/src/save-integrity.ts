import {
  CRIT_MULTIPLIER,
  DIFFICULTY_EXP,
  STREAK_BONUSES,
} from "./constants";
import { getDaysBetween, getLevelState, getTodayDateKey } from "./utils";
import type { HabitCompletion, HabitQuestData } from "./types";

const MAX_STREAK_BONUS = Math.max(0, ...Object.values(STREAK_BONUSES));
const MAX_SINGLE_SYNC_EXP_DELTA = 50_000;
const MAX_SINGLE_SYNC_COIN_EARN_DELTA = 10_000;

/**
 * Server-side integrity checks for cloud saves.
 * Rejects impossible wallets, future completions, inflated per-clear EXP,
 * and removal of already-settled completions vs the previous cloud save.
 */
export function sanitizeSaveForSync(data: HabitQuestData): HabitQuestData {
  const expectedCoins = Math.max(
    0,
    data.wallet.lifetimeCoinsEarned - data.wallet.lifetimeCoinsSpent,
  );
  const expectedLevel = getLevelState(Math.max(0, data.userProgress.totalExp)).level;

  return {
    ...data,
    wallet: {
      ...data.wallet,
      totalCoins: expectedCoins,
      lifetimeCoinsEarned: Math.max(0, data.wallet.lifetimeCoinsEarned),
      lifetimeCoinsSpent: Math.max(0, data.wallet.lifetimeCoinsSpent),
    },
    userProgress: {
      ...data.userProgress,
      totalExp: Math.max(0, data.userProgress.totalExp),
      level: expectedLevel,
    },
  };
}

/**
 * Full-save snapshots must not erase completion history they forgot.
 * Incoming rows win on the same habit+date; extras already in the cloud stay.
 */
export function mergeCompletionsForFullSave(
  existing: HabitCompletion[],
  incoming: HabitCompletion[],
): HabitCompletion[] {
  const incomingKeys = new Set(
    incoming.map((completion) => `${completion.habitId}:${completion.date}`),
  );
  const preserved = existing.filter(
    (completion) => !incomingKeys.has(`${completion.habitId}:${completion.date}`),
  );
  return [...incoming, ...preserved];
}

export function validateSaveIntegrity(
  data: HabitQuestData,
  previous: HabitQuestData | null,
  today = getTodayDateKey(),
): { ok: true } | { ok: false; error: string } {
  const { wallet, userProgress, completions, habits, rewardSystems } = data;

  if (
    wallet.totalCoins < 0 ||
    wallet.lifetimeCoinsEarned < 0 ||
    wallet.lifetimeCoinsSpent < 0 ||
    userProgress.totalExp < 0
  ) {
    return { ok: false, error: "Progress values cannot be negative." };
  }

  if (wallet.totalCoins !== wallet.lifetimeCoinsEarned - wallet.lifetimeCoinsSpent) {
    return {
      ok: false,
      error: "Wallet balance must equal lifetime earned minus lifetime spent.",
    };
  }

  const expectedLevel = getLevelState(userProgress.totalExp).level;
  if (userProgress.level !== expectedLevel) {
    return { ok: false, error: "Level does not match total EXP." };
  }

  // Allow settled-through up to local tomorrow so UTC+N clients are accepted
  // when the host clock is still on the previous UTC day.
  if (
    rewardSystems.progressSettledThroughDate &&
    getDaysBetween(today, rewardSystems.progressSettledThroughDate) > 1
  ) {
    return {
      ok: false,
      error: "Progress cannot be settled through a future date.",
    };
  }

  const habitIds = new Set(habits.map((habit) => habit.id));
  const seen = new Set<string>();

  for (const completion of completions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(completion.date)) {
      return { ok: false, error: "Completion dates must use YYYY-MM-DD." };
    }
    // Same +1 day grace as settled-through: UTC+8 midnight is still "yesterday" in UTC.
    if (getDaysBetween(today, completion.date) > 1) {
      return { ok: false, error: "Completions cannot be dated in the future." };
    }

    const key = `${completion.habitId}:${completion.date}`;
    if (seen.has(key)) {
      return { ok: false, error: "Duplicate habit completion for the same day." };
    }
    seen.add(key);

    const habit = habits.find((entry) => entry.id === completion.habitId);
    if (!habit) {
      continue;
    }

    const maxBase = DIFFICULTY_EXP[habit.difficulty] * CRIT_MULTIPLIER;
    if (completion.expEarned < 0 || completion.expEarned > maxBase) {
      return {
        ok: false,
        error: `Completion EXP out of range for ${habit.difficulty} habits.`,
      };
    }
    if (completion.streakBonusExp < 0 || completion.streakBonusExp > MAX_STREAK_BONUS) {
      return { ok: false, error: "Streak bonus EXP is out of allowed range." };
    }
  }

  if (previous) {
    const expDelta = data.userProgress.totalExp - previous.userProgress.totalExp;
    const coinEarnDelta =
      data.wallet.lifetimeCoinsEarned - previous.wallet.lifetimeCoinsEarned;

    if (expDelta > MAX_SINGLE_SYNC_EXP_DELTA) {
      return { ok: false, error: "EXP jump is too large for a single sync." };
    }
    if (coinEarnDelta > MAX_SINGLE_SYNC_COIN_EARN_DELTA) {
      return { ok: false, error: "Coin earn jump is too large for a single sync." };
    }

    for (const completion of previous.completions) {
      if (completion.date >= today) {
        continue;
      }
      // Habit deletes may purge related history.
      if (!habitIds.has(completion.habitId)) {
        continue;
      }
      const stillPresent = data.completions.some(
        (entry) => entry.habitId === completion.habitId && entry.date === completion.date,
      );
      if (!stillPresent) {
        return {
          ok: false,
          error: "Settled completions cannot be removed after the day locks in.",
        };
      }
    }
  }

  return { ok: true };
}
