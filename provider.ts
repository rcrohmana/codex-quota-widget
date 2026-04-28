const SHORT_WINDOW_MIN_SECONDS = 4 * 60 * 60;
const SHORT_WINDOW_MAX_SECONDS = 24 * 60 * 60;
const WEEKLY_WINDOW_MIN_SECONDS = 7 * 24 * 60 * 60;

export function isCodexProvider(providerId: string | undefined): boolean {
  return typeof providerId === "string" && /^openai-codex(?:-\d+)?$/.test(providerId);
}

export function isCodexProviderModel(
  model:
    | {
        provider?: string;
        id?: string;
      }
    | undefined,
): boolean {
  return isCodexProvider(model?.provider);
}

export function classifyWindowKindFromSeconds(
  windowSeconds: number | null | undefined,
): "short" | "weekly" | null {
  if (typeof windowSeconds !== "number" || !Number.isFinite(windowSeconds)) {
    return null;
  }
  if (windowSeconds >= WEEKLY_WINDOW_MIN_SECONDS) {
    return "weekly";
  }
  if (
    windowSeconds >= SHORT_WINDOW_MIN_SECONDS &&
    windowSeconds <= SHORT_WINDOW_MAX_SECONDS
  ) {
    return "short";
  }
  return null;
}

