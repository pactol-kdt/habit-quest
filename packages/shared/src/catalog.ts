import { createId } from "./utils";
import { createQuestArcs, createSeasonPass } from "./rewards";
import type {
  Achievement,
  Challenge,
  LevelUnlock,
  QuestArc,
  SeasonPassReward,
  ShopItem,
  UnlockFeature,
} from "./types";

export type HabitQuestCatalog = {
  shopItems: ShopItem[];
  achievements: Achievement[];
  challenges: Challenge[];
  levelUnlocks: LevelUnlock[];
  questArcs: QuestArc[];
  seasonRewards: SeasonPassReward[];
};

function createAchievement(
  key: string,
  title: string,
  description: string,
  category: Achievement["category"],
  icon: string,
  reward: Achievement["reward"],
): Achievement {
  return {
    id: createId("achievement"),
    key,
    title,
    description,
    category,
    icon,
    unlocked: false,
    unlockedAt: null,
    rewardedAt: null,
    reward,
  };
}

function createShopItem(item: Omit<ShopItem, "owned">): ShopItem {
  return { ...item, owned: false };
}

function createLevelUnlock(
  feature: UnlockFeature,
  requiredLevel: number,
  label: string,
  description: string,
): LevelUnlock {
  return {
    id: createId("unlock"),
    feature,
    requiredLevel,
    label,
    description,
    unlocked: false,
    unlockedAt: null,
  };
}

function createChallenge(
  config: Omit<Challenge, "id" | "progress" | "completed" | "claimed" | "startsAt" | "endsAt">,
): Challenge {
  const isWeekly = config.period === "weekly";
  const now = new Date();
  const startsAt = isWeekly
    ? (() => {
        const date = new Date(now);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        date.setDate(date.getDate() + diff);
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const dayNum = `${date.getDate()}`.padStart(2, "0");
        return `${year}-${month}-${dayNum}`;
      })()
    : (() => {
        const year = now.getFullYear();
        const month = `${now.getMonth() + 1}`.padStart(2, "0");
        return `${year}-${month}-01`;
      })();
  const endsAt = isWeekly
    ? (() => {
        const date = new Date(`${startsAt}T12:00:00`);
        date.setDate(date.getDate() + 6);
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const dayNum = `${date.getDate()}`.padStart(2, "0");
        return `${year}-${month}-${dayNum}`;
      })()
    : (() => {
        const date = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const dayNum = `${date.getDate()}`.padStart(2, "0");
        return `${year}-${month}-${dayNum}`;
      })();

  return {
    ...config,
    id: createId("challenge"),
    progress: 0,
    completed: false,
    claimed: false,
    startsAt,
    endsAt,
  };
}

/** Builtin catalog used to seed PostgreSQL and as fallback if DB is empty. */
export function getBuiltinCatalog(): HabitQuestCatalog {
  const season = createSeasonPass();
  return {
    achievements: [
      createAchievement("first-habit-completed", "First Habit Completed", "Take the first clean step into your run.", "beginner", "Spark", { coins: 3, exp: 20 }),
      createAchievement("reach-level-2", "Reach Level 2", "Prove that momentum is real.", "beginner", "Rune", { coins: 3, exp: 30 }),
      createAchievement("seven-day-streak", "7 Day Streak", "Hold the line for a full week.", "streak", "Flame", { coins: 6, exp: 60 }),
      createAchievement("thirty-day-streak", "30 Day Streak", "Build a streak that changes identity, not mood.", "streak", "Inferno", { coins: 15, exp: 200 }),
      createAchievement("complete-50-habits", "Complete 50 Habits", "Stack enough clears to feel the system working.", "completion", "Ledger", { coins: 10, exp: 80 }),
      createAchievement("complete-100-habits", "Complete 100 Habits", "Hit triple digits on completed habits.", "completion", "Relic", { coins: 18, exp: 150 }),
      createAchievement("reach-level-5", "Reach Level 5", "Break into the veteran tier.", "level", "Crown", { coins: 12, exp: 120 }),
      createAchievement("reach-level-10", "Reach Level 10", "Enter the elite progression bracket.", "level", "Astral", { coins: 25, exp: 250 }),
      createAchievement("buy-first-cosmetic", "Buy First Cosmetic", "Spend coins on identity, not just numbers.", "shop", "Mask", { coins: 5, exp: 40 }),
      createAchievement("complete-weekly-challenge", "Complete Weekly Challenge", "Finish your first weekly contract.", "challenge", "Banner", { coins: 10, exp: 100 }),
      createAchievement("defeat-weekly-boss", "Defeat Weekly Boss", "Bring a weekly boss HP bar to zero.", "challenge", "Raid", { coins: 10, exp: 100 }),
      createAchievement("complete-season-pass", "Complete Season Pass", "Claim the season finale for the first time.", "challenge", "Season", { coins: 12, exp: 120 }),
    ],
    challenges: [
      createChallenge({
        key: "weekly-contract",
        title: "Weekly Contract",
        description: "Complete 15 habits this week.",
        period: "weekly",
        type: "habit-completions",
        target: 15,
        reward: {
          coins: 12,
          exp: 150,
          titleItemId: "title_weekly_vanguard",
        },
      }),
      createChallenge({
        key: "monthly-ascension",
        title: "Monthly Ascension",
        description: "Earn 2000 EXP this month.",
        period: "monthly",
        type: "exp-earned",
        target: 2000,
        reward: {
          coins: 35,
          exp: 400,
          titleItemId: "title_monthly_archon",
        },
      }),
    ],
    shopItems: [
      createShopItem({ id: "title_beginner", name: "Initiate", description: "First mark of the Keep — you showed up.", category: "title", rarity: "common", price: 20, requiredLevel: 1, requiredFeature: "titles", preview: "Initiate tag", exclusive: false }),
      createShopItem({ id: "title_dawn_runner", name: "Dawn Runner", description: "For early clears before the day hardens.", category: "title", rarity: "rare", price: 40, requiredLevel: 2, requiredFeature: "titles", preview: "Dawn sigil", exclusive: false }),
      createShopItem({ id: "title_habit_hunter", name: "Habit Hunter", description: "Treat daily discipline like a tracked quarry.", category: "title", rarity: "rare", price: 60, requiredLevel: 2, requiredFeature: "titles", preview: "Hunter sigil", exclusive: false }),
      createShopItem({ id: "title_iron_week", name: "Iron Week", description: "Seven days that refused to bend.", category: "title", rarity: "epic", price: 90, requiredLevel: 5, requiredFeature: "titles", preview: "Iron crest", exclusive: false }),
      createShopItem({ id: "title_discipline_master", name: "Discipline Master", description: "A title that implies hard-won consistency.", category: "title", rarity: "epic", price: 140, requiredLevel: 5, requiredFeature: "titles", preview: "Master crest", exclusive: false }),
      createShopItem({ id: "title_night_grinder", name: "Night Grinder", description: "For the late-hour player who still closes quests.", category: "title", rarity: "epic", price: 150, requiredLevel: 5, requiredFeature: "titles", preview: "Lunar badge", exclusive: false }),
      createShopItem({ id: "title_weekly_vanguard", name: "Weekly Vanguard", description: "Exclusive title earned from clearing a weekly contract.", category: "title", rarity: "epic", price: 0, requiredLevel: 3, requiredFeature: "titles", preview: "Challenge insignia", exclusive: true }),
      createShopItem({ id: "title_monthly_archon", name: "Monthly Archon", description: "Exclusive title earned from a major monthly climb.", category: "title", rarity: "legendary", price: 0, requiredLevel: 7, requiredFeature: "titles", preview: "Celestial seal", exclusive: true }),
      createShopItem({ id: "title_season_cleared", name: "Season Cleared", description: "Exclusive title for claiming a season finale.", category: "title", rarity: "legendary", price: 0, requiredLevel: 4, requiredFeature: "titles", preview: "Finale seal", exclusive: true }),
      createShopItem({ id: "frame_ink_line", name: "Ink Line", description: "A thin archival border — quiet and sharp.", category: "frame", rarity: "common", price: 40, requiredLevel: 5, requiredFeature: "profile-frames", preview: "Ink edge", exclusive: false }),
      createShopItem({ id: "frame_bronze", name: "Bronze Frame", description: "A grounded metallic profile frame.", category: "frame", rarity: "common", price: 35, requiredLevel: 5, requiredFeature: "profile-frames", preview: "Bronze edge", exclusive: false }),
      createShopItem({ id: "frame_forge_ring", name: "Forge Ring", description: "Warm metal ring with hammered notches.", category: "frame", rarity: "rare", price: 80, requiredLevel: 5, requiredFeature: "profile-frames", preview: "Forge ring", exclusive: false }),
      createShopItem({ id: "frame_neon", name: "Neon Frame", description: "Reactive cyan border with arcade energy.", category: "frame", rarity: "rare", price: 100, requiredLevel: 5, requiredFeature: "profile-frames", preview: "Neon circuit", exclusive: false }),
      createShopItem({ id: "frame_aurora_filigree", name: "Aurora Filigree", description: "Fine northern-light tracery around your mark.", category: "frame", rarity: "epic", price: 150, requiredLevel: 5, requiredFeature: "profile-frames", preview: "Filigree", exclusive: false }),
      createShopItem({ id: "frame_galaxy", name: "Galaxy Frame", description: "An animated cosmic frame with deep-space color shifts.", category: "frame", rarity: "legendary", price: 320, requiredLevel: 10, requiredFeature: "legendary-cosmetics", preview: "Stellar ring", exclusive: false }),
      createShopItem({ id: "avatar_knight", name: "Knight", description: "Warden of the early path — armor and oath.", category: "avatar", rarity: "common", price: 30, requiredLevel: 1, requiredFeature: null, preview: "K", exclusive: false }),
      createShopItem({ id: "avatar_scribe", name: "Scribe", description: "Ink-stained focus; progress written daily.", category: "avatar", rarity: "rare", price: 50, requiredLevel: 2, requiredFeature: null, preview: "Sc", exclusive: false }),
      createShopItem({ id: "avatar_wizard", name: "Wizard", description: "Long-form strategy and careful casting.", category: "avatar", rarity: "rare", price: 70, requiredLevel: 2, requiredFeature: null, preview: "W", exclusive: false }),
      createShopItem({ id: "avatar_warden", name: "Warden", description: "Shielded resolve — hold the line you drew.", category: "avatar", rarity: "epic", price: 85, requiredLevel: 4, requiredFeature: null, preview: "Wd", exclusive: false }),
      createShopItem({ id: "avatar_ranger", name: "Ranger", description: "Trail discipline; one clear after another.", category: "avatar", rarity: "epic", price: 110, requiredLevel: 5, requiredFeature: null, preview: "R", exclusive: false }),
      createShopItem({ id: "avatar_samurai", name: "Samurai", description: "Minimalist steel and ruthless follow-through.", category: "avatar", rarity: "epic", price: 160, requiredLevel: 5, requiredFeature: null, preview: "S", exclusive: false }),
      createShopItem({ id: "avatar_cyber_ninja", name: "Cyber Ninja", description: "Legendary stealth aesthetic for top-tier grinders.", category: "avatar", rarity: "legendary", price: 340, requiredLevel: 10, requiredFeature: "legendary-cosmetics", preview: "CN", exclusive: false }),
      createShopItem({
        id: "theme_ember",
        name: "Ember Theme",
        description: "Warm forge glow — earned from Quest Chapter 2.",
        category: "theme",
        rarity: "epic",
        price: 0,
        requiredLevel: 4,
        requiredFeature: "themes",
        preview: "Ember",
        exclusive: true,
        themeVars: {
          "--color-bg": "#1a0c08",
          "--color-bg-muted": "#2a140c",
          "--color-cyan": "#ff7a3d",
          "--color-pink": "#fb7185",
          "--color-gold": "#fbbf24",
          "--color-green": "#fdba74",
          "--hq-accent-ink": "#1a0a04",
        },
      }),
      createShopItem({
        id: "theme_aurora",
        name: "Aurora Theme",
        description: "Northern lights wash — earned from Quest Chapter 3.",
        category: "theme",
        rarity: "legendary",
        price: 0,
        requiredLevel: 4,
        requiredFeature: "themes",
        preview: "Aurora",
        exclusive: true,
        themeVars: {
          "--color-bg": "#04151c",
          "--color-bg-muted": "#0a2630",
          "--color-cyan": "#2dd4bf",
          "--color-pink": "#c084fc",
          "--color-gold": "#67e8f9",
          "--color-green": "#34d399",
          "--hq-accent-ink": "#021016",
        },
      }),
      createShopItem({
        id: "theme_midnight",
        name: "Midnight Theme",
        description: "Deep night blues for focused late runs.",
        category: "theme",
        rarity: "rare",
        price: 140,
        requiredLevel: 4,
        requiredFeature: "themes",
        preview: "Midnight",
        exclusive: false,
        themeVars: {
          "--color-bg": "#030712",
          "--color-bg-muted": "#0b1228",
          "--color-cyan": "#60a5fa",
          "--color-pink": "#818cf8",
          "--color-gold": "#93c5fd",
          "--color-green": "#38bdf8",
          "--hq-accent-ink": "#020617",
        },
      }),
      createShopItem({
        id: "theme_coastal_mist",
        name: "Coastal Mist",
        description: "Cool teal-slate air for clear-headed mornings.",
        category: "theme",
        rarity: "rare",
        price: 95,
        requiredLevel: 4,
        requiredFeature: "themes",
        preview: "Coastal",
        exclusive: false,
        themeVars: {
          "--color-bg": "#0a1418",
          "--color-bg-muted": "#122028",
          "--color-cyan": "#5eead4",
          "--color-pink": "#94a3b8",
          "--color-gold": "#7dd3fc",
          "--color-green": "#6ee7b7",
          "--hq-accent-ink": "#061016",
        },
      }),
      createShopItem({
        id: "theme_archive_sepia",
        name: "Archive Sepia",
        description: "Paper, ink, and lamp light — a ledger keeper's hall.",
        category: "theme",
        rarity: "epic",
        price: 125,
        requiredLevel: 4,
        requiredFeature: "themes",
        preview: "Archive",
        exclusive: false,
        themeVars: {
          "--color-bg": "#1a120c",
          "--color-bg-muted": "#2a1c12",
          "--color-cyan": "#d4a574",
          "--color-pink": "#c4a484",
          "--color-gold": "#e8c47c",
          "--color-green": "#a3b18a",
          "--hq-accent-ink": "#120c08",
        },
      }),
    ],
    levelUnlocks: [
      createLevelUnlock("titles", 2, "Titles", "Unlock title cosmetics in the shop."),
      createLevelUnlock("weekly-challenges", 3, "Weekly Challenges", "Activate weekly contract tracking and rewards."),
      createLevelUnlock("quest-arcs", 3, "Quest Arcs", "Unlock multi-chapter quest arcs with chapter rewards."),
      createLevelUnlock("themes", 4, "Themes", "Equip visual themes that restyle the entire app."),
      createLevelUnlock("season-pass", 4, "Season Pass", "Earn monthly season XP and claim tier rewards."),
      createLevelUnlock("profile-frames", 5, "Profile Frames", "Buy and equip profile frame cosmetics."),
      createLevelUnlock("monthly-challenges", 7, "Monthly Challenges", "Open monthly climb challenges and rewards."),
      createLevelUnlock("legendary-cosmetics", 10, "Legendary Cosmetics", "Gain access to legendary avatars, titles, and frames."),
    ],
    questArcs: createQuestArcs(),
    seasonRewards: season.rewards,
  };
}
