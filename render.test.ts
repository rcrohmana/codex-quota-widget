import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderQuotaWidget } from "./render.ts";
import type { CodexQuotaSnapshot } from "./types.ts";

function snapshot(resetAt: number, fetchedAt = 1_000_000): CodexQuotaSnapshot {
  return {
    providerId: "openai-codex",
    shortWindow: {
      kind: "short",
      usedPercent: 25,
      windowSeconds: 18_000,
      resetAfterSeconds: 14_400,
      resetAt,
      source: "headers",
    },
    weeklyWindow: null,
    fetchedAt,
    status: "partial",
  };
}

describe("renderQuotaWidget", () => {
  it("computes remaining time from resetAt at render time", () => {
    const lines = renderQuotaWidget(snapshot(1_000_000 + 3_600), 80, 1_000_000_000);

    assert.match(lines[0], /25%\(1h0m\)/);
  });

  it("falls back to resetAfterSeconds when resetAt is unavailable", () => {
    const quota = snapshot(0);
    quota.shortWindow!.resetAt = null;

    const lines = renderQuotaWidget(quota, 80, 1_000_000_000);

    assert.match(lines[0], /25%\(4h0m\)/);
  });
});
