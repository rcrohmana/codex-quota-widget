import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCodexProviderFromContext, shouldRefreshSnapshot, shouldRefreshUsageAfterActivity } from "./index.ts";
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

describe("getCodexProviderFromContext", () => {
  it("falls back to the current context model provider when active provider is unavailable", () => {
    assert.equal(
      getCodexProviderFromContext(undefined, { model: { provider: "openai-codex-5" } }),
      "openai-codex-5",
    );
  });

  it("prefers the active provider when it is a Codex provider", () => {
    assert.equal(
      getCodexProviderFromContext("openai-codex", { model: { provider: "openai-codex-5" } }),
      "openai-codex",
    );
  });
});

describe("shouldRefreshUsageAfterActivity", () => {
  it("refreshes after Codex activity when headers were unavailable", () => {
    assert.equal(shouldRefreshUsageAfterActivity(true, false), true);
  });

  it("refreshes after Codex activity when headers were parsed", () => {
    assert.equal(shouldRefreshUsageAfterActivity(true, true), true);
  });

  it("does not refresh when there was no Codex activity", () => {
    assert.equal(shouldRefreshUsageAfterActivity(false, true), false);
  });
});
