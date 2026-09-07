import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getBuiltinCatalog } from "./catalog.ts";
import {
  BOSS_CLEAR_COINS,
  BOSS_MAX_HP,
  COMEBACK_COINS,
  COMBO_COIN_THRESHOLDS,
  DAILY_COMPLETION_COINS,
  DAILY_LOGIN_COINS,
  SEASON_PASS_XP_PER_LEVEL,
  STREAK_FREEZE_COST,
} from "./constants.ts";
import { createQuestArcs, createSeasonPass, createWeeklyBoss } from "./rewards.ts";

/** Purchasable shop total after Paths of the Keep cosmetics pass. */
const TARGET_PURCHASABLE_SHOP_SUM = 2430;
/** Achievement coin payout sum after season-clear achievement. */
const TARGET_ACHIEVEMENT_COIN_SUM = 129;
/** Season L2–L30 coin sum after the long-track redesign. */
const TARGET_SEASON_COIN_SUM = 71;

describe("economy balance guardrails", () => {
  it("keeps purchasable shop prices at the intended total", () => {
    const catalog = getBuiltinCatalog();
    const purchasable = catalog.shopItems.filter((item) => !item.exclusive && item.price > 0);
    const sum = purchasable.reduce((total, item) => total + item.price, 0);
    assert.equal(sum, TARGET_PURCHASABLE_SHOP_SUM);
    assert.deepEqual(
      Object.fromEntries(purchasable.map((item) => [item.id, item.price])),
      {
        title_beginner: 20,
        title_dawn_runner: 40,
        title_habit_hunter: 60,
        title_iron_week: 90,
        title_discipline_master: 140,
        title_night_grinder: 150,
        frame_ink_line: 40,
        frame_bronze: 35,
        frame_forge_ring: 80,
        frame_neon: 100,
        frame_aurora_filigree: 150,
        frame_galaxy: 320,
        avatar_knight: 30,
        avatar_scribe: 50,
        avatar_wizard: 70,
        avatar_warden: 85,
        avatar_ranger: 110,
        avatar_samurai: 160,
        avatar_cyber_ninja: 340,
        theme_midnight: 140,
        theme_coastal_mist: 95,
        theme_archive_sepia: 125,
      },
    );
  });

  it("keeps key earn constants in the intended band", () => {
    assert.equal(DAILY_LOGIN_COINS, 1);
    assert.equal(DAILY_COMPLETION_COINS, 1);
    assert.deepEqual([...COMBO_COIN_THRESHOLDS], [4, 7]);
    assert.equal(COMEBACK_COINS, 6);
    assert.equal(BOSS_CLEAR_COINS, 20);
    assert.equal(STREAK_FREEZE_COST, 40);
    assert.equal(SEASON_PASS_XP_PER_LEVEL, 40);
    assert.equal(createWeeklyBoss().maxHp, BOSS_MAX_HP);
    assert.equal(BOSS_MAX_HP, 160);
  });

  it("keeps challenge, quest, season, and achievement coin totals leaner", () => {
    const catalog = getBuiltinCatalog();
    const weekly = catalog.challenges.find((entry) => entry.period === "weekly");
    const monthly = catalog.challenges.find((entry) => entry.period === "monthly");
    assert.equal(weekly?.reward.coins, 12);
    assert.equal(monthly?.reward.coins, 35);

    const questCoins = createQuestArcs().map((arc) => arc.reward.coins);
    assert.deepEqual(questCoins, [10, 18, 28]);

    const season = createSeasonPass();
    assert.equal(season.rewards.length, 29);
    assert.equal(season.rewards[0]?.level, 2);
    assert.equal(season.rewards.at(-1)?.level, 30);
    const seasonCoins = season.rewards.reduce((sum, reward) => sum + reward.coins, 0);
    assert.equal(seasonCoins, TARGET_SEASON_COIN_SUM);

    const achievementCoins = catalog.achievements.reduce(
      (sum, achievement) => sum + achievement.reward.coins,
      0,
    );
    assert.equal(achievementCoins, TARGET_ACHIEVEMENT_COIN_SUM);
    assert.ok(catalog.achievements.some((entry) => entry.key === "complete-season-pass"));
  });
});
