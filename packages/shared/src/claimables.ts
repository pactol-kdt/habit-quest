import { isFeatureUnlocked } from "./utils";
import type { HabitQuestData } from "./types";

export type ClaimableKind = "challenge" | "quest" | "season" | "boss";

export type ClaimableReward = {
  id: string;
  kind: ClaimableKind;
  title: string;
  detail: string;
  href: string;
};

/**
 * Rewards the player can claim now.
 */
export function listClaimableRewards(data: HabitQuestData): ClaimableReward[] {
  const items: ClaimableReward[] = [];

  for (const challenge of data.challenges) {
    const weeklyOk =
      challenge.period === "weekly" &&
      isFeatureUnlocked(data.levelUnlocks, "weekly-challenges");
    const monthlyOk =
      challenge.period === "monthly" &&
      isFeatureUnlocked(data.levelUnlocks, "monthly-challenges");
    if (!weeklyOk && !monthlyOk) {
      continue;
    }
    if (challenge.completed && !challenge.claimed) {
      items.push({
        id: `challenge:${challenge.id}`,
        kind: "challenge",
        title:
          challenge.period === "weekly"
            ? "15 clears"
            : challenge.period === "monthly"
              ? "Monthly climb"
              : challenge.title,
        detail: "Ready to claim",
        href: challenge.period === "weekly" ? "/boss#clears" : "/season#month",
      });
    }
  }

  if (isFeatureUnlocked(data.levelUnlocks, "quest-arcs")) {
    for (const arc of data.questArcs) {
      if (arc.completed && !arc.claimed) {
        items.push({
          id: `quest:${arc.id}`,
          kind: "quest",
          title: arc.title,
          detail: "Chapter ready",
          href: "/season#chapter",
        });
      }
    }
  }

  if (isFeatureUnlocked(data.levelUnlocks, "season-pass")) {
    for (const reward of data.seasonPass.rewards) {
      if (
        data.seasonPass.level >= reward.level &&
        !data.seasonPass.claimedLevels.includes(reward.level)
      ) {
        items.push({
          id: `season:${reward.level}`,
          kind: "season",
          title: `Season Lv ${reward.level}`,
          detail: reward.label,
          href: "/season",
        });
      }
    }
  }

  if (data.weeklyBoss.defeated && !data.weeklyBoss.rewardClaimed) {
    items.push({
      id: "boss-reward",
      kind: "boss",
      title: "Weekly challenge",
      detail: "Weekly reward ready",
      href: "/boss",
    });
  }

  return items;
}
