import {
  COMBO_COIN_THRESHOLDS,
  COMBO_EXP_PER_EXTRA_CLEAR,
} from "~/lib/habitquest/constants";

/** Same-day clear combo rewards (applied at end-of-day settlement). */
export function getComboRewards(clearCount: number) {
  if (clearCount <= 0) {
    return { exp: 0, coins: 0 };
  }

  const exp = Math.max(0, clearCount - 1) * COMBO_EXP_PER_EXTRA_CLEAR;
  const coins = COMBO_COIN_THRESHOLDS.filter((threshold) => clearCount >= threshold).length;

  return { exp, coins };
}

/** Next coin-threshold milestone after the current clear count, if any. */
export function getNextComboMilestone(clearCount: number) {
  return COMBO_COIN_THRESHOLDS.find((threshold) => clearCount < threshold) ?? null;
}

export function hitComboCoinMilestone(previousCount: number, nextCount: number) {
  return COMBO_COIN_THRESHOLDS.some(
    (threshold) => previousCount < threshold && nextCount >= threshold,
  );
}
