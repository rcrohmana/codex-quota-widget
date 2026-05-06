import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldRefreshSnapshot } from "./index.ts";
import type { CodexQuotaSnapshot } from "./types.ts";

function snapshot(fetchedAt: number): CodexQuotaSnapshot {
  return {
    providerId: "openai-codex",
    shortWindow: null,
    weeklyWindow: null,
    fetchedAt,
    status: "unavailable",
  };
}

describe("shouldRefreshSnapshot", () => {
  it("refreshes missing snapshots", () => {
    assert.equal(shouldRefreshSnapshot(undefined, 1000, 60_000), true);
  });

  it("refreshes snapshots older than the ttl", () => {
    assert.equal(shouldRefreshSnapshot(snapshot(1000), 62_000, 60_000), true);
  });

  it("keeps snapshots inside the ttl", () => {
    assert.equal(shouldRefreshSnapshot(snapshot(1000), 30_000, 60_000), false);
  });
});
