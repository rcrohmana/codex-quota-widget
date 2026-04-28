import { classifyWindowKindFromSeconds } from "./provider.ts";
import type { CodexQuotaSnapshot, QuotaWindow } from "./types.ts";

interface UsageWindowPayload {
  used_percent?: number;
  limit_window_seconds?: number;
  reset_after_seconds?: number;
  reset_at?: number;
}

interface UsagePayload {
  plan_type?: string;
  rate_limit?: {
    allowed?: boolean;
    limit_reached?: boolean;
    primary_window?: UsageWindowPayload | null;
    secondary_window?: UsageWindowPayload | null;
  };
}

function normalizeUsageWindow(
  input: UsageWindowPayload | null | undefined,
): QuotaWindow | null {
  if (!input || typeof input.limit_window_seconds !== "number") {
    return null;
  }

  const kind = classifyWindowKindFromSeconds(input.limit_window_seconds);
  if (!kind) return null;

  return {
    kind,
    usedPercent:
      typeof input.used_percent === "number" ? input.used_percent : null,
    windowSeconds: input.limit_window_seconds,
    resetAfterSeconds:
      typeof input.reset_after_seconds === "number" ? input.reset_after_seconds : null,
    resetAt: typeof input.reset_at === "number" ? input.reset_at : null,
    source: "usage",
  };
}

export function parseCodexUsagePayload(
  payload: UsagePayload,
  providerId: string,
  now = Date.now(),
): CodexQuotaSnapshot {
  const windows = [
    normalizeUsageWindow(payload.rate_limit?.primary_window),
    normalizeUsageWindow(payload.rate_limit?.secondary_window),
  ].filter((value): value is QuotaWindow => value !== null);

  const shortWindow = windows.find((window) => window.kind === "short") ?? null;
  const weeklyWindow = windows.find((window) => window.kind === "weekly") ?? null;

  return {
    providerId,
    planType: payload.plan_type,
    shortWindow,
    weeklyWindow,
    fetchedAt: now,
    status: shortWindow && weeklyWindow ? "ok" : windows.length > 0 ? "partial" : "unavailable",
  };
}
