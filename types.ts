export type WindowKind = "short" | "weekly";

export interface QuotaWindow {
  kind: WindowKind;
  usedPercent: number | null;
  windowSeconds: number | null;
  resetAfterSeconds: number | null;
  resetAt: number | null;
  source: "headers" | "usage";
}

export interface CodexQuotaSnapshot {
  providerId: string;
  planType?: string;
  activeLimit?: string;
  creditsBalance?: string | number | null;
  creditsUnlimited?: boolean | null;
  shortWindow: QuotaWindow | null;
  weeklyWindow: QuotaWindow | null;
  fetchedAt: number;
  status: "ok" | "partial" | "unavailable" | "error";
  errorMessage?: string;
}
