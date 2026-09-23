import { isStarterCosmetic } from "~/lib/habitquest/catalog";

/** How a cosmetic is earned or bought. Exclusive items are never sold. */
export function cosmeticObtainLabel(item: { id: string; exclusive: boolean }) {
  if (isStarterCosmetic(item.id)) {
    return "Yours from the start.";
  }

  switch (item.id) {
    case "title_weekly_vanguard":
      return "Obtain by completing 15 habits this week.";
    case "title_monthly_archon":
      return "Obtain by completing the monthly climb.";
    case "title_season_cleared":
      return "Obtain by finishing the season.";
    case "theme_ember":
      return "Obtain by completing quest chapter 2.";
    case "theme_aurora":
      return "Obtain by completing quest chapter 3.";
    default:
      return item.exclusive ? "Obtain by earning it." : "Obtain by purchasing in the shop.";
  }
}
