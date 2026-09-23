import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyCloudHandoff } from "./guest-handoff.ts";

describe("guest account handoff", () => {
  it("installs a fresh save when signing in drops the guest run", () => {
    assert.equal(emptyCloudHandoff({ discardGuest: true }), "install-fresh");
  });

  it("keeps migrating a local cache for an already signed-in refresh", () => {
    assert.equal(emptyCloudHandoff({}), "migrate-local");
    assert.equal(emptyCloudHandoff({ discardGuest: false }), "migrate-local");
  });
});
