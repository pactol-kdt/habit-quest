import { DAILY_LOGIN_COINS, MAX_STREAK_FREEZES } from "./constants";
import { settleHabitDayProgress } from "./day-settlement";
import {
  createCelebration,
  createDefaultRewardSystems,
  createQuestArcs,
  createSeasonPass,
  maybeGrantStreakFreeze,
  reconcileSeasonPass,
  reconcileStreakShields,
  reconcileTodayCombo,
  syncQuestArcs,
} from "./rewards";
import {
  checkLevelUnlocks,
  createExpEntry,
  createId,
  getPendingAchievementRewards,
  getTodayDateKey,
  hasClaimedDailyReward,
  reconcileChallenges,
  unlockAchievements,
} from "./utils";
import { getEffectiveUserProgress } from "./day-settlement";
import type {
  CelebrationEvent,
  Challenge,
  ExpHistoryEntry,
  FloatingReward,
  HabitQuestData,
  SettlementRecap,
} from "./types";

export type ResolveGameStateOptions = {
  processDailyLogin?: boolean;
  /**
   * Client-only: tab already paid daily login this session (sessionStorage).
   * When true, mark claimed without paying again. Server should leave this false.
   */
  skipDailyLoginPayout?: boolean;
  today?: string;
};

export type ResolveGameStateResult = {
  data: HabitQuestData;
  floatingRewards: FloatingReward[];
  celebrations: CelebrationEvent[];
  settlementRecap: SettlementRecap | null;
};

function createFloatingReward(
  kind: FloatingReward["kind"],
  value: number,
  label: string,
): FloatingReward {
  return {
    id: createId("fx"),
    kind,
    value,
    label,
  };
}

function syncWithShields(
  data: HabitQuestData,
  extra: Partial<HabitQuestData["userProgress"]> = {},
) {
  return getEffectiveUserProgress({
    ...data,
    userProgress: {
      ...data.userProgress,
      ...extra,
    },
  });
}

function appendCoins(
  data: HabitQuestData,
  amount: number,
  label: string,
  floatingRewards: FloatingReward[],
) {
  data.wallet = {
    ...data.wallet,
    totalCoins: data.wallet.totalCoins + amount,
    lifetimeCoinsEarned: data.wallet.lifetimeCoinsEarned + amount,
  };
  floatingRewards.push(createFloatingReward("coins", amount, label));
}

function appendExp(
  data: HabitQuestData,
  amount: number,
  source: ExpHistoryEntry["source"],
  label: string,
  floatingRewards: FloatingReward[],
  today: string,
) {
  data.userProgress = syncWithShields(data, {
    totalExp: data.userProgress.totalExp + amount,
    expHistory: [createExpEntry(amount, today, source, label), ...data.userProgress.expHistory],
  });
  floatingRewards.push(createFloatingReward("exp", amount, label));
}

function applyChallengeReward(
  data: HabitQuestData,
  challenge: Challenge,
  floatingRewards: FloatingReward[],
  celebrations: CelebrationEvent[],
  today: string,
  options: { autoClaimed?: boolean } = {},
) {
  if (challenge.reward.coins > 0) {
    appendCoins(
      data,
      challenge.reward.coins,
      options.autoClaimed ? `${challenge.title} (auto-claimed)` : challenge.title,
      floatingRewards,
    );
  }

  if (challenge.reward.exp > 0) {
    appendExp(
      data,
      challenge.reward.exp,
      "challenge",
      options.autoClaimed ? `${challenge.title} (auto-claimed)` : challenge.title,
      floatingRewards,
      today,
    );
  }

  if (challenge.reward.titleItemId) {
    const titleId = challenge.reward.titleItemId;
    const alreadyOwned = data.shopItems.some((item) => item.id === titleId && item.owned);
    data.shopItems = data.shopItems.map((item) =>
      item.id === titleId
        ? {
            ...item,
            owned: true,
          }
        : item,
    );
    if (!alreadyOwned) {
      celebrations.push(
        createCelebration(
          "unlock",
          options.autoClaimed ? "Challenge title auto-claimed" : "Exclusive title unlocked",
          data.shopItems.find((item) => item.id === titleId)?.name ?? "",
        ),
      );
    } else {
      const repeatBonus = challenge.period === "monthly" ? 25 : 10;
      appendCoins(
        data,
        repeatBonus,
        options.autoClaimed
          ? `${challenge.title} repeat bonus (auto-claimed)`
          : `${challenge.title} repeat bonus`,
        floatingRewards,
      );
    }
  }
}

function ensureRewardFields(data: HabitQuestData): HabitQuestData {
  const defaults = createDefaultRewardSystems();
  const rewardSystems = {
    ...defaults,
    ...(data.rewardSystems ?? {}),
    seasonPassCompletions: data.rewardSystems?.seasonPassCompletions ?? 0,
  };
  return {
    ...data,
    rewardSystems,
    questArcs: data.questArcs?.length ? data.questArcs : createQuestArcs(),
    seasonPass: data.seasonPass ?? createSeasonPass(),
    equippedItems: {
      titleItemId: data.equippedItems?.titleItemId ?? null,
      frameItemId: data.equippedItems?.frameItemId ?? null,
      avatarItemId: data.equippedItems?.avatarItemId ?? null,
      themeItemId: data.equippedItems?.themeItemId ?? null,
    },
  };
}

function normalizePersistentData(data: HabitQuestData) {
  const withRewards = ensureRewardFields(data);
  const rewardSystems = reconcileTodayCombo(withRewards.rewardSystems, withRewards.completions);
  return {
    ...withRewards,
    rewardSystems,
    seasonPass: reconcileSeasonPass(withRewards.seasonPass),
    userProgress: syncWithShields({ ...withRewards, rewardSystems }),
  };
}

/**
 * Persistent game resolution shared by client and server.
 * Does not touch sessionStorage — pass skipDailyLoginPayout from the client guard.
 */
export function resolvePersistentGameState(
  baseData: HabitQuestData,
  options: ResolveGameStateOptions = {},
): ResolveGameStateResult {
  let data = normalizePersistentData(baseData);
  const floatingRewards: FloatingReward[] = [];
  const celebrations: CelebrationEvent[] = [];
  let settlementRecap: SettlementRecap | null = null;
  const today = options.today ?? getTodayDateKey();

  if (options.processDailyLogin) {
    const alreadyClaimed = hasClaimedDailyReward(data.dailyRewards, "login", today);

    if (!alreadyClaimed && !options.skipDailyLoginPayout) {
      appendCoins(data, DAILY_LOGIN_COINS, "Daily login reward", floatingRewards);
      data.dailyRewards = {
        ...data.dailyRewards,
        lastLoginDate: today,
        claimedDailyLoginDate: today,
      };
    } else if (!alreadyClaimed && options.skipDailyLoginPayout) {
      data.dailyRewards = {
        ...data.dailyRewards,
        lastLoginDate: today,
        claimedDailyLoginDate: today,
      };
    } else if (data.dailyRewards.lastLoginDate !== today) {
      data.dailyRewards = {
        ...data.dailyRewards,
        lastLoginDate: today,
      };
    }
  }

  const settlement = settleHabitDayProgress(data, today);
  data = settlement.data;
  floatingRewards.push(...settlement.floatingRewards);
  celebrations.push(...settlement.celebrations);
  settlementRecap = settlement.recap;

  const shieldResult = reconcileStreakShields(data.rewardSystems, data.completions, today);
  data.rewardSystems = shieldResult.systems;
  if (shieldResult.freezeUsed && shieldResult.protectedDate) {
    celebrations.push(
      createCelebration(
        "unlock",
        "Streak freeze used",
        `Your streak was protected on ${shieldResult.protectedDate}.`,
      ),
    );
  }

  data.userProgress = syncWithShields(data);

  const freezeGrant = maybeGrantStreakFreeze(
    data.rewardSystems,
    data.userProgress.currentStreak,
  );
  data.rewardSystems = freezeGrant.systems;
  if (freezeGrant.granted) {
    celebrations.push(
      createCelebration(
        "unlock",
        "Streak freeze earned",
        `Milestone streak ${data.userProgress.currentStreak} granted a freeze (${data.rewardSystems.streakFreezes}/${MAX_STREAK_FREEZES}).`,
      ),
    );
  }

  data.questArcs = syncQuestArcs(
    data.questArcs,
    data,
    data.rewardSystems.progressSettledThroughDate,
  );

  const challengeReconciliation = reconcileChallenges(data.challenges, data);
  data.challenges = challengeReconciliation.challenges;

  challengeReconciliation.autoClaims.forEach((challenge) => {
    applyChallengeReward(data, challenge, floatingRewards, celebrations, today, {
      autoClaimed: true,
    });
  });

  data.challenges = reconcileChallenges(data.challenges, data).challenges;

  let iterations = 0;
  while (iterations < 8) {
    iterations += 1;
    data.achievements = unlockAchievements(data);
    const pendingRewards = getPendingAchievementRewards(data.achievements);

    if (!pendingRewards.length) {
      break;
    }

    const rewardTime = new Date().toISOString();
    pendingRewards.forEach((achievement) => {
      if (achievement.reward.coins > 0) {
        appendCoins(data, achievement.reward.coins, achievement.title, floatingRewards);
      }

      if (achievement.reward.exp > 0) {
        appendExp(
          data,
          achievement.reward.exp,
          "achievement",
          achievement.title,
          floatingRewards,
          today,
        );
      }

      celebrations.push(
        createCelebration("achievement", "Achievement unlocked", achievement.title),
      );

      data.achievements = data.achievements.map((entry) =>
        entry.id === achievement.id
          ? {
              ...entry,
              rewardedAt: rewardTime,
            }
          : entry,
      );
    });

    data.userProgress = syncWithShields(data);
    data.challenges = reconcileChallenges(data.challenges, data).challenges;
    data.questArcs = syncQuestArcs(
      data.questArcs,
      data,
      data.rewardSystems.progressSettledThroughDate,
    );
  }

  const unlockCheck = checkLevelUnlocks(data.levelUnlocks, data.userProgress.level);
  data.levelUnlocks = unlockCheck.levelUnlocks;
  unlockCheck.newlyUnlocked.forEach((unlock) => {
    celebrations.push(
      createCelebration(
        "unlock",
        "Feature unlocked",
        `${unlock.label} is now available at level ${unlock.requiredLevel}.`,
      ),
    );
  });

  return {
    data,
    floatingRewards,
    celebrations,
    settlementRecap,
  };
}
