export type StreakFireTier =
  | "dormant"
  | "spark"
  | "ember"
  | "blaze"
  | "inferno"
  | "legendary"
  | "eternal"
  | "apex";

/** Visual fire intensity from settled streak — aligned to milestone thresholds. */
export function getStreakFireTier(streak: number): StreakFireTier {
  if (streak >= 100) {
    return "apex";
  }
  if (streak >= 60) {
    return "eternal";
  }
  if (streak >= 30) {
    return "legendary";
  }
  if (streak >= 14) {
    return "inferno";
  }
  if (streak >= 7) {
    return "blaze";
  }
  if (streak >= 3) {
    return "ember";
  }
  if (streak >= 1) {
    return "spark";
  }
  return "dormant";
}

export function streakFireBorderClass(tier: StreakFireTier) {
  if (tier === "dormant" || tier === "spark") {
    return "hq-streak-panel";
  }
  return `hq-streak-panel hq-streak-panel--${tier}`;
}

export function streakFlameClass(tier: StreakFireTier) {
  return `hq-streak-flame hq-streak-flame--${tier}`;
}
