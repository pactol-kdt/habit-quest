import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPetSpeechLines } from "./copy.ts";
import {
  getPetProgress,
  getPetStage,
  petCountLabel,
  petStageAdvanced,
} from "./pet.ts";

describe("pet growth", () => {
  it("starts as an egg and hatches on the first finish", () => {
    assert.equal(getPetStage(0).id, "egg");
    assert.equal(getPetStage(1).id, "hatchling");
    assert.equal(petCountLabel(0), "0 of 1");
  });

  it("uses lifetime finishes, with the same count for an easy or hard habit", () => {
    assert.equal(getPetStage(9).id, "hatchling");
    assert.equal(getPetStage(10).label, "Scout");
    assert.equal(getPetStage(29).id, "scout");
    assert.equal(getPetStage(30).id, "keeper");
    assert.equal(getPetStage(99).id, "keeper");
    assert.equal(getPetStage(100).id, "warden");
    assert.equal(getPetStage(300).id, "elder");
    assert.equal(getPetStage(480).id, "elder");
    assert.equal(petCountLabel(12), "12 of 30");
    assert.equal(petCountLabel(300), "300 finished");
    assert.equal(getPetProgress(300).next, null);
  });

  it("reports only the form a rising count lands on", () => {
    assert.equal(petStageAdvanced(0, 1)?.id, "hatchling");
    assert.equal(petStageAdvanced(9, 10)?.id, "scout");
    assert.equal(petStageAdvanced(8, 31)?.id, "keeper");
    assert.equal(petStageAdvanced(12, 13), null);
    assert.equal(petStageAdvanced(10, 9), null);
    assert.equal(petStageAdvanced(300, 301), null);
  });

  it("cheers instead of listing the day's count", () => {
    const open = buildPetSpeechLines({ name: "Sharp", done: 0, due: 4 });
    assert.ok(open.includes("You've got this."));
    assert.ok(open.includes("Sharp, you've got this."));
    assert.equal(open.some((line) => line.includes("due")), false);

    const done = buildPetSpeechLines({ name: "", done: 2, due: 2 });
    assert.ok(done.includes("You finished. I'm proud of you."));

    const rest = buildPetSpeechLines({ name: "", done: 0, due: 0 });
    assert.ok(rest.includes("Nothing's due. I'm glad you're here."));
  });

});
