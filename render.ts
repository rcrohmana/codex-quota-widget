import type { CodexQuotaSnapshot, QuotaWindow, WindowKind } from "./types.ts";

const FILLED = "█";
const EMPTY = "░";
const RENDER_SAFETY_MARGIN = 12;
const COMPACT_RENDER_THRESHOLD = 60;

export function formatRemainingTime(
  resetAfterSeconds: number | null | undefined,
  kind: WindowKind,
): string {
  if (typeof resetAfterSeconds !== "number" || resetAfterSeconds <= 0) {
    return "--";
  }

  if (kind === "weekly") {
    const days = Math.floor(resetAfterSeconds / 86_400);
    const hours = Math.floor((resetAfterSeconds % 86_400) / 3_600);
    if (days > 0) return `${days}d${hours}h`;
  }

  const hours = Math.floor(resetAfterSeconds / 3_600);
  const minutes = Math.floor((resetAfterSeconds % 3_600) / 60);
  if (hours > 0) return `${hours}h${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

function clampPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function makeBar(percent: number | null | undefined, width: number): string {
  if (width <= 0) return "";
  const filled = Math.round((clampPercent(percent) / 100) * width);
  return FILLED.repeat(filled) + EMPTY.repeat(Math.max(0, width - filled));
}

function getRemainingSeconds(window: QuotaWindow, now: number): number | null {
  if (typeof window.resetAt === "number") {
    return Math.max(0, window.resetAt - Math.floor(now / 1000));
  }
  return window.resetAfterSeconds;
}

function formatMeta(window: QuotaWindow | null, now: number): string {
  if (!window) {
    return "--";
  }

  const percent = clampPercent(window.usedPercent);
  const time = formatRemainingTime(getRemainingSeconds(window, now), window.kind);
  return `${percent}%(${time})`;
}

function allocateBars(totalWidth: number): [number, number] {
  if (totalWidth <= 0) return [0, 0];
  const shortBar = Math.ceil(totalWidth / 2);
  const weeklyBar = Math.max(0, totalWidth - shortBar);
  return [shortBar, weeklyBar];
}

function buildSingleRow(
  shortWindow: QuotaWindow | null,
  weeklyWindow: QuotaWindow | null,
  width: number,
  separator: string,
  now: number,
): string {
  const shortMeta = formatMeta(shortWindow, now);
  const weeklyMeta = formatMeta(weeklyWindow, now);
  const fixedWidth = `h:${shortMeta}${separator}w:${weeklyMeta}`.length + 2;
  const remaining = Math.max(0, width - fixedWidth);
  const [shortBarWidth, weeklyBarWidth] = allocateBars(remaining);
  const shortBar = makeBar(shortWindow?.usedPercent, shortBarWidth);
  const weeklyBar = makeBar(weeklyWindow?.usedPercent, weeklyBarWidth);
  const shortPart = `h:${shortBar}${shortBar ? " " : ""}${shortMeta}`;
  const weeklyPart = `w:${weeklyBar}${weeklyBar ? " " : ""}${weeklyMeta}`;
  return `${shortPart}${separator}${weeklyPart}`;
}

export function renderQuotaWidget(
  snapshot: CodexQuotaSnapshot | null,
  width: number,
  now = Date.now(),
): string[] {
  const appliedMargin = width >= COMPACT_RENDER_THRESHOLD ? RENDER_SAFETY_MARGIN : 4;
  const safeWidth = Math.max(24, width - appliedMargin);
  const shortWindow = snapshot?.shortWindow ?? null;
  const weeklyWindow = snapshot?.weeklyWindow ?? null;

  let line = buildSingleRow(shortWindow, weeklyWindow, safeWidth, " | ", now);
  if (line.length > safeWidth) {
    line = buildSingleRow(shortWindow, weeklyWindow, safeWidth, "|", now);
  }

  if (line.length > safeWidth) {
    line = line.slice(0, safeWidth);
  }

  return [line];
}
