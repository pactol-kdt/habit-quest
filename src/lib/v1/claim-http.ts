import type { ClaimActionResult } from "~/lib/v1/claims";
import { jsonFromUnauthenticatedOrError, jsonOk } from "~/lib/v1/http";

export function jsonFromClaimResult(result: ClaimActionResult) {
  if (result.status !== "ok") {
    return jsonFromUnauthenticatedOrError(result);
  }
  return jsonOk({
    wallet: result.wallet,
    userProgress: result.userProgress,
    challenges: result.challenges,
    questArcs: result.questArcs,
    seasonPass: result.seasonPass,
    weeklyBoss: result.weeklyBoss,
    rewardSystems: result.rewardSystems,
    shopItems: result.shopItems,
    updatedAt: result.updatedAt,
  });
}
