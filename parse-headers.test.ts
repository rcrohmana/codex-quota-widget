import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCodexHeaders } from "./parse-headers.ts";

describe("parseCodexHeaders", () => {
  it("parses official Codex reset-at headers", () => {
    const snapshot = parseCodexHeaders(
      {
        "x-codex-primary-used-percent": "37.5",
        "x-codex-primary-window-minutes": "300",
        "x-codex-primary-reset-at": "1800000000",
        "x-codex-secondary-used-percent": "62",
        "x-codex-secondary-window-minutes": "10080",
        "x-codex-secondary-reset-at": "1800300000",
      },
      "openai-codex-5",
      1_700_000_000_000,
    );

    assert.equal(snapshot?.shortWindow?.usedPercent, 37.5);
    assert.equal(snapshot?.shortWindow?.resetAt, 1_800_000_000);
    assert.equal(snapshot?.shortWindow?.resetAfterSeconds, 100_000_000);
    assert.equal(snapshot?.weeklyWindow?.usedPercent, 62);
    assert.equal(snapshot?.weeklyWindow?.resetAt, 1_800_300_000);
  });

  it("keeps legacy reset-after headers working", () => {
    const snapshot = parseCodexHeaders(
      {
        "x-codex-primary-used-percent": "12",
        "x-codex-primary-window-minutes": "300",
        "x-codex-primary-reset-after-seconds": "9000",
      },
      "openai-codex-5",
      1_700_000_000_000,
    );

    assert.equal(snapshot?.shortWindow?.resetAfterSeconds, 9000);
    assert.equal(snapshot?.shortWindow?.resetAt, 1_700_009_000);
  });
});
