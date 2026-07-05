// Server-side token vault for real integrations. Tokens are stored in
// .data/connectors.json (gitignored) — good for local/demo use. In production
// swap this for a database or a secrets manager.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type StoredToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // epoch ms
  meta?: Record<string, string>; // e.g. QuickBooks realmId, Gmail address
};

const FILE = path.join(process.cwd(), ".data", "connectors.json");

function readAll(): Record<string, StoredToken> {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

export function getToken(provider: string): StoredToken | null {
  return readAll()[provider] ?? null;
}

export function saveToken(provider: string, token: StoredToken): void {
  const all = readAll();
  all[provider] = token;
  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(all, null, 2));
}

export function deleteToken(provider: string): void {
  const all = readAll();
  delete all[provider];
  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(all, null, 2));
}
