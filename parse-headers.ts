import { classifyWindowKindFromSeconds } from "./provider.ts";
import type { CodexQuotaSnapshot, QuotaWindow } from "./types.ts";

function parseNumber(value: string | undefined): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildWindow(
  usedPercent: string | undefined,
  windowMinutes: string | undefined,
  resetAfterSeconds: string | undefined,
  resetAtSeconds: string | undefined,
  source: "headers",
  now: number,
): QuotaWindow | null {
  const windowSeconds = (() => {
    const minutes = parseNumber(windowMinutes);
    return minutes === null ? null : minutes * 60;
  })();

  const kind = classifyWindowKindFromSeconds(windowSeconds);
  if (!kind) return null;

  const used = parseNumber(usedPercent);
  const explicitResetAt = parseNumber(resetAtSeconds);
  const parsedResetAfter = parseNumber(resetAfterSeconds);
  const resetAfter =
    parsedResetAfter ??
    (explicitResetAt === null ? null : Math.max(0, explicitResetAt - Math.floor(now / 1000)));
  const resetAt =
    explicitResetAt ?? (resetAfter === null ? null : Math.floor((now + resetAfter * 1000) / 1000));

  return {
    kind,
    usedPercent: used,
    windowSeconds,
    resetAfterSeconds: resetAfter,
    resetAt,
    source,
  };
}

export function parseCodexHeaders(
  headers: Record<string, string | undefined>,
  providerId: string,
  now = Date.now(),
): CodexQuotaSnapshot | null {
  const primary = buildWindow(
    headers["x-codex-primary-used-percent"],
    headers["x-codex-primary-window-minutes"],
    headers["x-codex-primary-reset-after-seconds"],
    headers["x-codex-primary-reset-at"],
    "headers",
    now,
  );

  const secondary = buildWindow(
    headers["x-codex-secondary-used-percent"],
    headers["x-codex-secondary-window-minutes"],
    headers["x-codex-secondary-reset-after-seconds"],
    headers["x-codex-secondary-reset-at"],
    "headers",
    now,
  );

  const windows = [primary, secondary].filter((value): value is QuotaWindow => value !== null);
  if (windows.length === 0) return null;

  const shortWindow = windows.find((window) => window.kind === "short") ?? null;
  const weeklyWindow = windows.find((window) => window.kind === "weekly") ?? null;

  return {
    providerId,
    planType: headers["x-codex-plan-type"],
    activeLimit: headers["x-codex-active-limit"],
    creditsBalance: headers["x-codex-credits-balance"] ?? null,
    creditsUnlimited:
      headers["x-codex-credits-unlimited"] === undefined
        ? null
        : headers["x-codex-credits-unlimited"] === "true",
    shortWindow,
    weeklyWindow,
    fetchedAt: now,
    status: shortWindow && weeklyWindow ? "ok" : "partial",
  };
}
