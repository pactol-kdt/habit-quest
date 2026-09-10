import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidDateKey } from "./parse.ts";
import { statusForCommandError } from "./http.ts";

describe("v1 date keys", () => {
  it("accepts YYYY-MM-DD", () => {
    assert.equal(isValidDateKey("2026-09-07"), true);
  });

  it("rejects other shapes", () => {
    assert.equal(isValidDateKey("09-07-2026"), false);
    assert.equal(isValidDateKey("2026/09/07"), false);
    assert.equal(isValidDateKey(""), false);
  });
});

describe("v1 command error status", () => {
  it("maps auth, missing save, and validation", () => {
    assert.equal(statusForCommandError("Sign in required."), 401);
    assert.equal(statusForCommandError("No cloud save found."), 404);
    assert.equal(statusForCommandError("Admin access required."), 403);
    assert.equal(statusForCommandError("dateKey must be YYYY-MM-DD."), 400);
    assert.equal(statusForCommandError("habitId is required."), 400);
    assert.equal(statusForCommandError("Invalid current password."), 400);
  });

  it("maps domain rule failures to 409", () => {
    assert.equal(statusForCommandError("Already completed today."), 409);
    assert.equal(statusForCommandError("Habit not found."), 409);
  });
});
