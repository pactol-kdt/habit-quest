import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canLinkStackAfter,
  describeStackFormula,
  isNextInStack,
  normalizeCueTime,
  sortHabitsByLoop,
} from "./habit-loop.ts";
import type { Habit } from "../../types/habitquest.ts";

function habit(partial: Partial<Habit> & Pick<Habit, "id" | "title">): Habit {
  return {
    description: "",
    difficulty: "easy",
    recurrence: "daily",
    customDays: [],
    stackAfter: "",
    stackAfterHabitId: null,
    cueTime: null,
    cueContext: "",
    identityWhy: "",
    desiredFeeling: "",
    tinyVersion: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("habit stacking helpers", () => {
  it("formats After X, I will Y", () => {
    const stretch = habit({
      id: "a",
      title: "stretch",
      stackAfter: "I pour coffee",
    });
    assert.equal(describeStackFormula(stretch), "After I pour coffee, I will stretch");
  });

  it("prefers linked habit titles for stacks", () => {
    const coffee = habit({ id: "coffee", title: "Make coffee" });
    const stretch = habit({
      id: "stretch",
      title: "stretch",
      stackAfter: "something else",
      stackAfterHabitId: "coffee",
    });
    assert.equal(
      describeStackFormula(stretch, [coffee, stretch]),
      "After Make coffee, I will stretch",
    );
  });

  it("orders by cue time then stack depth", () => {
    const anchor = habit({ id: "a", title: "Anchor", cueTime: "08:00" });
    const stacked = habit({
      id: "b",
      title: "Stacked",
      cueTime: "08:00",
      stackAfterHabitId: "a",
    });
    const later = habit({ id: "c", title: "Later", cueTime: "18:00" });
    const ordered = sortHabitsByLoop([later, stacked, anchor]);
    assert.deepEqual(
      ordered.map((entry) => entry.id),
      ["a", "b", "c"],
    );
  });

  it("keeps completed habits below incomplete ones", () => {
    const morning = habit({ id: "a", title: "Morning", cueTime: "07:00" });
    const evening = habit({ id: "b", title: "Evening", cueTime: "20:00" });
    const ordered = sortHabitsByLoop([morning, evening], {
      completedIds: new Set(["a"]),
    });
    assert.deepEqual(
      ordered.map((entry) => entry.id),
      ["b", "a"],
    );
  });

  it("normalizes cue times", () => {
    assert.equal(normalizeCueTime("7:05"), "07:05");
    assert.equal(normalizeCueTime("25:00"), null);
  });

  it("allows only one follower per anchor", () => {
    const a = habit({ id: "a", title: "A" });
    const b = habit({ id: "b", title: "B", stackAfterHabitId: "a" });
    const c = habit({ id: "c", title: "C" });
    assert.equal(canLinkStackAfter([a, b, c], "a"), false);
    assert.equal(canLinkStackAfter([a, b, c], "a", "b"), true);
    assert.equal(canLinkStackAfter([a, b, c], "b"), true);
  });

  it("marks only the chain next habit", () => {
    const a = habit({ id: "a", title: "A" });
    const b = habit({ id: "b", title: "B", stackAfterHabitId: "a" });
    const c = habit({ id: "c", title: "C", stackAfterHabitId: "a" });
    const done = new Set(["a"]);
    assert.equal(isNextInStack(b, [a, b, c], done), true);
    assert.equal(isNextInStack(c, [a, b, c], done), false);
  });
});
