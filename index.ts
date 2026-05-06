import path from "node:path";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { readCodexAuthRecord } from "./auth.ts";
import { parseCodexHeaders } from "./parse-headers.ts";
import { parseCodexUsagePayload } from "./parse-usage.ts";
import { isCodexProvider, isCodexProviderModel } from "./provider.ts";
import { renderQuotaWidget } from "./render.ts";
import type { CodexQuotaSnapshot } from "./types.ts";

const WIDGET_ID = "codex-quota";
const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const CACHE_TTL_MS = 60_000;

export function getActiveSnapshot(
  cache: Map<string, CodexQuotaSnapshot>,
  providerId: string | undefined,
): CodexQuotaSnapshot | null {
  if (!providerId) return null;
  return cache.get(providerId) ?? null;
}

export function shouldRefreshSnapshot(
  snapshot: CodexQuotaSnapshot | undefined,
  now = Date.now(),
  ttlMs = CACHE_TTL_MS,
): boolean {
  return !snapshot || now - snapshot.fetchedAt >= ttlMs;
}

export function getCodexProviderFromContext(
  activeProviderId: string | undefined,
  ctx: Pick<ExtensionContext, "model">,
): string | undefined {
  if (isCodexProvider(activeProviderId)) return activeProviderId;
  return isCodexProvider(ctx.model?.provider) ? ctx.model?.provider : undefined;
}

export function shouldRefreshUsageAfterActivity(hadCodexActivity: boolean): boolean {
  return hadCodexActivity;
}

function mergeSnapshots(
  previous: CodexQuotaSnapshot | undefined,
  next: CodexQuotaSnapshot,
): CodexQuotaSnapshot {
  return {
    ...previous,
    ...next,
    planType: next.planType ?? previous?.planType,
    activeLimit: next.activeLimit ?? previous?.activeLimit,
    creditsBalance: next.creditsBalance ?? previous?.creditsBalance,
    creditsUnlimited: next.creditsUnlimited ?? previous?.creditsUnlimited,
    errorMessage: next.errorMessage ?? previous?.errorMessage,
    shortWindow: next.shortWindow ?? previous?.shortWindow ?? null,
    weeklyWindow: next.weeklyWindow ?? previous?.weeklyWindow ?? null,
  };
}

function getAuthFilePath(): string {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
  return path.join(home, ".pi", "agent", "auth.json");
}

export default function codexQuotaWidget(pi: ExtensionAPI) {
  const cache = new Map<string, CodexQuotaSnapshot>();
  let activeProviderId: string | undefined;
  let hadCodexActivity = false;

  async function fetchUsage(providerId: string): Promise<CodexQuotaSnapshot | null> {
    const auth = await readCodexAuthRecord(getAuthFilePath(), providerId);
    if (!auth) return null;

    const response = await fetch(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: "application/json",
        ...(auth.accountId ? { "ChatGPT-Account-Id": auth.accountId } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Codex usage request failed: ${response.status}`);
    }

    const payload = await response.json();
    return parseCodexUsagePayload(payload, providerId, Date.now());
  }

  function showWidget(ctx: ExtensionContext) {
    if (!ctx.hasUI || !activeProviderId) return;
    const snapshot = getActiveSnapshot(cache, activeProviderId);
    ctx.ui.setWidget(
      WIDGET_ID,
      renderQuotaWidget(snapshot, process.stdout.columns ?? 80),
      { placement: "belowEditor" },
    );
  }

  function hideWidget(ctx: ExtensionContext) {
    if (!ctx.hasUI) return;
    ctx.ui.setWidget(WIDGET_ID, undefined, { placement: "belowEditor" });
  }

  async function refreshFromUsage(providerId: string, ctx: ExtensionContext) {
    try {
      const snapshot = await fetchUsage(providerId);
      if (snapshot) {
        cache.set(providerId, mergeSnapshots(cache.get(providerId), snapshot));
      }
    } catch {
      // Keep the last rendered cache/neutral state.
    }
    showWidget(ctx);
  }

  pi.on("session_start", async (_event, ctx) => {
    if (!isCodexProviderModel(ctx.model)) {
      activeProviderId = undefined;
      hideWidget(ctx);
      return;
    }

    activeProviderId = ctx.model?.provider;
    showWidget(ctx);

    if (activeProviderId && shouldRefreshSnapshot(cache.get(activeProviderId))) {
      await refreshFromUsage(activeProviderId, ctx);
    }
  });

  pi.on("model_select", async (event, ctx) => {
    if (!isCodexProvider(event.model.provider)) {
      activeProviderId = undefined;
      hideWidget(ctx);
      return;
    }

    activeProviderId = event.model.provider;
    showWidget(ctx);

    if (shouldRefreshSnapshot(cache.get(activeProviderId))) {
      await refreshFromUsage(activeProviderId, ctx);
    }
  });

  pi.on("after_provider_response", async (event, ctx) => {
    const providerId = getCodexProviderFromContext(activeProviderId, ctx);
    if (!providerId) return;

    activeProviderId = providerId;
    hadCodexActivity = true;

    const parsed = parseCodexHeaders(
      event.headers as Record<string, string | undefined>,
      providerId,
      Date.now(),
    );
    if (!parsed) return;

    cache.set(providerId, mergeSnapshots(cache.get(providerId), parsed));
    showWidget(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    const providerId = getCodexProviderFromContext(activeProviderId, ctx);
    if (!providerId) return;

    if (!shouldRefreshUsageAfterActivity(hadCodexActivity)) return;

    hadCodexActivity = false;
    activeProviderId = providerId;
    await refreshFromUsage(providerId, ctx);
  });

  pi.registerCommand("codex-quota", {
    description: "Refresh the active Codex quota widget",
    handler: async (_args, ctx) => {
      if (!activeProviderId) {
        if (ctx.hasUI) {
          ctx.ui.notify("No active Codex model selected", "warning");
        }
        return;
      }

      try {
        const snapshot = await fetchUsage(activeProviderId);
        if (snapshot) {
          cache.set(activeProviderId, mergeSnapshots(cache.get(activeProviderId), snapshot));
        }
        showWidget(ctx);
        if (ctx.hasUI) {
          ctx.ui.notify(`Codex quota refreshed for ${activeProviderId}`, "info");
        }
      } catch (error) {
        showWidget(ctx);
        if (ctx.hasUI) {
          ctx.ui.notify(
            error instanceof Error ? error.message : "Failed to refresh Codex quota",
            "error",
          );
        }
      }
    },
  });
}
