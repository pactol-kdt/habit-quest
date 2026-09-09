import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createOpaqueToken, hashOpaqueToken } from "./opaque-token.ts";

describe("opaque reset tokens", () => {
  it("hashes the same token + secret to the same digest", () => {
    const token = "a".repeat(64);
    const secret = "habitquest-test-secret";
    assert.equal(hashOpaqueToken(token, secret), hashOpaqueToken(token, secret));
    assert.equal(hashOpaqueToken(token, secret).length, 64);
  });

  it("changes when the token or secret changes", () => {
    const secret = "habitquest-test-secret";
    const left = hashOpaqueToken("token-a", secret);
    const right = hashOpaqueToken("token-b", secret);
    assert.notEqual(left, right);
    assert.notEqual(hashOpaqueToken("token-a", secret), hashOpaqueToken("token-a", "other-secret"));
  });

  it("creates a 64-character hex token", () => {
    const token = createOpaqueToken();
    assert.match(token, /^[a-f0-9]{64}$/);
  });
});
