"use server";

import {
  buyStreakFreezeAction as buyStreakFreeze,
  claimAllRewardsAction as claimAllRewards,
  claimBossRewardAction as claimBossReward,
  claimChallengeRewardAction as claimChallengeReward,
  claimQuestArcRewardAction as claimQuestArcReward,
  claimSeasonPassLevelAction as claimSeasonPassLevel,
  completeOnboardingAction as completeOnboarding,
  updateSettingsAction as updateSettings,
} from "~/lib/v1/claims";
import type { UserSettings } from "~/types/habitquest";

export type { ClaimActionResult, SettingsActionResult } from "~/lib/v1/claims";

export async function updateSettingsAction(patch: Partial<UserSettings>) {
  return updateSettings(patch);
}

export async function completeOnboardingAction(displayName: string) {
  return completeOnboarding(displayName);
}

export async function claimChallengeRewardAction(challengeId: string) {
  return claimChallengeReward(challengeId);
}

export async function claimQuestArcRewardAction(arcId: string) {
  return claimQuestArcReward(arcId);
}

export async function claimSeasonPassLevelAction(level: number) {
  return claimSeasonPassLevel(level);
}

export async function claimAllRewardsAction(kinds?: string[]) {
  return claimAllRewards(kinds);
}

export async function claimBossRewardAction() {
  return claimBossReward();
}

export async function buyStreakFreezeAction() {
  return buyStreakFreeze();
}
