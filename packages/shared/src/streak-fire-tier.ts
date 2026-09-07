export type StreakFireTier =
  | "dormant"
  | "spark"
  | "ember"
  | "blaze"
  | "inferno"
  | "legendary"
  | "eternal"
  | "apex";

const TIER_LABELS: Record<StreakFireTier, string> = {
  dormant: "Dormant",
  spark: "Spark",
  ember: "Ember",
  blaze: "Blaze",
  inferno: "Inferno",
  legendary: "Legendary",
  eternal: "Eternal",
  apex: "Apex",
};

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

export function streakFireTierLabel(tier: StreakFireTier) {
  return TIER_LABELS[tier];
}

export function streakFireBorderClass(tier: StreakFireTier) {
  return `hq-streak-panel hq-streak-panel--${tier}`;
}

export function streakFlameClass(tier: StreakFireTier) {
  return `hq-streak-flame hq-streak-flame--${tier}`;
}
