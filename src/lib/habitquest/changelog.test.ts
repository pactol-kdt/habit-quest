import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CHANGELOG, getLatestChangelogEntry, isChangelogUnseen } from "./changelog.ts";

describe("changelog", () => {
  it("keeps the newest release first", () => {
    const latest = getLatestChangelogEntry();
    assert.equal(latest, CHANGELOG[0]);
    assert.equal(latest?.version, "0.17.0");
    assert.ok(latest && latest.changes.length >= 3 && latest.changes.length <= 7);
  });

  it("allows an older release to omit a date", () => {
    const older = CHANGELOG.find((entry) => entry.version === "0.16.0");
    assert.ok(older);
    assert.equal(older?.date, undefined);
    assert.ok(older && older.changes.length > 0);
  });

  it("treats a matching seen version as already opened", () => {
    assert.equal(isChangelogUnseen(null), true);
    assert.equal(isChangelogUnseen("0.16.0"), true);
    assert.equal(isChangelogUnseen("0.17.0"), false);
  });
});
