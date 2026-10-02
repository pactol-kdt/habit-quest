import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyCompleteOnboarding } from "./reward-claim-mutations.ts";
import { createSeedData } from "./seed.ts";
import {
  getStarterHabitBlueprints,
  parseStarterHabitKeys,
  selectStarterHabits,
} from "./starter-habits.ts";

describe("starter habit selection", () => {
  it("replaces the seed list with one chosen example", () => {
    const next = selectStarterHabits(createSeedData(), ["stretch"]);
    assert.equal(next.habits.length, 1);
    assert.equal(next.habits[0]?.title, "Morning stretch");
    assert.equal(next.habits[0]?.tinyVersion, "Reach for the ceiling once");
    assert.equal(next.habits[0]?.recurrence, "daily");
    assert.equal(Object.hasOwn(next.habits[0] ?? {}, "tutorial"), false);
  });

  it("keeps several chosen examples in blueprint order", () => {
    const next = selectStarterHabits(createSeedData(), ["journal", "strength"]);
    assert.deepEqual(
      next.habits.map((habit) => habit.title),
      ["Strength training", "Journal recap"],
    );
  });

  it("allows starting with no examples", () => {
    const next = selectStarterHabits(createSeedData(), []);
    assert.deepEqual(next.habits, []);
  });

  it("leaves an onboarded save unchanged", () => {
    const data = createSeedData();
    data.settings = { ...data.settings, onboardingCompleted: true };
    const next = selectStarterHabits(data, ["stretch"]);
    assert.equal(next, data);
    assert.equal(next.habits.length, 4);
  });

  it("does not replace habits once a completion exists", () => {
    const data = createSeedData();
    const habit = data.habits[0]!;
    data.completions = [
      {
        id: "c1",
        habitId: habit.id,
        date: "2026-10-02",
        expEarned: 10,
        streakBonusExp: 0,
        completedAt: "2026-10-02T12:00:00.000Z",
      },
    ];
    const next = selectStarterHabits(data, []);
    assert.equal(next, data);
    assert.equal(next.habits.length, 4);
  });

  it("replaces again instead of appending when setup is refreshed", () => {
    const once = selectStarterHabits(createSeedData(), ["stretch", "journal"]);
    const twice = selectStarterHabits(once, ["stretch"]);
    assert.equal(twice.habits.length, 1);
    assert.equal(twice.habits[0]?.title, "Morning stretch");
  });

  it("does not recreate starters after onboarding is complete", () => {
    const selected = selectStarterHabits(createSeedData(), ["deep-work"]);
    const done = applyCompleteOnboarding(selected, "Ada").data;
    const replay = selectStarterHabits(done, ["stretch", "journal", "strength", "deep-work"]);
    assert.equal(replay, done);
    assert.equal(replay.habits.length, 1);
    assert.equal(replay.habits[0]?.title, "Deep work sprint");
  });

  it("uses the same definitions as a fresh seed", () => {
    const seed = createSeedData();
    const all = selectStarterHabits(createSeedData(), ["stretch", "deep-work", "strength", "journal"]);
    assert.deepEqual(
      seed.habits.map((habit) => habit.title),
      all.habits.map((habit) => habit.title),
    );
    assert.deepEqual(
      seed.habits.map((habit) => habit.tinyVersion),
      getStarterHabitBlueprints().map((blueprint) => blueprint.fields.tinyVersion),
    );
  });

  it("ignores unknown starter keys", () => {
    assert.deepEqual(parseStarterHabitKeys(["stretch", "nope", "stretch"]), ["stretch"]);
    assert.equal(parseStarterHabitKeys("stretch"), null);
  });
});
