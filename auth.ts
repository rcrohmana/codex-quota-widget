import { readFile } from "node:fs/promises";

interface RawCodexAuthRecord {
  access?: string;
  accountId?: string;
}

export interface CodexAuthRecord {
  accessToken: string;
  accountId?: string;
}

export async function readCodexAuthRecord(
  authFilePath: string,
  providerId: string,
): Promise<CodexAuthRecord | null> {
  const raw = await readFile(authFilePath, "utf8");
  const json = JSON.parse(raw) as Record<string, RawCodexAuthRecord>;
  const record = json[providerId];

  if (!record || typeof record.access !== "string" || record.access.length === 0) {
    return null;
  }

  return {
    accessToken: record.access,
    accountId: typeof record.accountId === "string" ? record.accountId : undefined,
  };
}
