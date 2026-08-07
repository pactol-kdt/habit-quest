import {
  CRIT_MULTIPLIER,
  DIFFICULTY_EXP,
  STREAK_BONUSES,
} from "~/lib/habitquest/constants";
import { getLevelState, getTodayDateKey } from "~/lib/habitquest/utils";
import type { HabitQuestData } from "~/types/habitquest";

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

  const yesterday = shiftDateKey(today, -1);
  if (
    rewardSystems.progressSettledThroughDate &&
    rewardSystems.progressSettledThroughDate > yesterday
  ) {
    return {
      ok: false,
      error: "Progress cannot be settled through today or a future date.",
    };
  }

  const habitIds = new Set(habits.map((habit) => habit.id));
  const seen = new Set<string>();

  for (const completion of completions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(completion.date)) {
      return { ok: false, error: "Completion dates must use YYYY-MM-DD." };
    }
    if (completion.date > today) {
      return { ok: false, error: "Completions cannot be dated in the future." };
    }
    if (!habitIds.has(completion.habitId)) {
      return { ok: false, error: "Completion references an unknown habit." };
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
