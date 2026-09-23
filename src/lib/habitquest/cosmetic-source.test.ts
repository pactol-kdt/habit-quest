import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cosmeticObtainLabel } from "./cosmetic-source.ts";

describe("cosmetic obtain labels", () => {
  it("names the earn path for exclusive titles and themes", () => {
    assert.equal(
      cosmeticObtainLabel({ id: "title_weekly_vanguard", exclusive: true }),
      "Obtain by completing 15 habits this week.",
    );
    assert.equal(
      cosmeticObtainLabel({ id: "title_monthly_archon", exclusive: true }),
      "Obtain by completing the monthly climb.",
    );
    assert.equal(
      cosmeticObtainLabel({ id: "title_season_cleared", exclusive: true }),
      "Obtain by finishing the season.",
    );
    assert.equal(
      cosmeticObtainLabel({ id: "theme_ember", exclusive: true }),
      "Obtain by completing quest chapter 2.",
    );
    assert.equal(
      cosmeticObtainLabel({ id: "theme_aurora", exclusive: true }),
      "Obtain by completing quest chapter 3.",
    );
  });

  it("sends buyable cosmetics to the shop", () => {
    assert.equal(
      cosmeticObtainLabel({ id: "avatar_knight", exclusive: false }),
      "Obtain by purchasing in the shop.",
    );
  });

  it("marks starter cosmetics as already yours", () => {
    assert.equal(
      cosmeticObtainLabel({ id: "avatar_default", exclusive: false }),
      "Yours from the start.",
    );
    assert.equal(
      cosmeticObtainLabel({ id: "theme_default", exclusive: false }),
      "Yours from the start.",
    );
  });
});
