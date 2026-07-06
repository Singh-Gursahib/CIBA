// Synchronous read of the Social Studio store, dependency-free so both
// context.ts and store.ts (brain map) can use it without a circular import.

import { readFileSync } from "node:fs";
import path from "node:path";

export type StudioPostLite = {
  id: string;
  memberId: string;
  projectId?: string;
  channelKey: string;
  channelBrand: string;
  title: string;
  format: string;
  status: string;
  approval?: string;
  scheduledFor?: string;
  publishedAt?: string;
  createdAt?: string;
  targets?: { platform: string; status: string }[];
};

export function readStudioPosts(): StudioPostLite[] {
  try {
    const file = path.join(process.cwd(), ".data", "social-posts.json");
    return JSON.parse(readFileSync(file, "utf8")) as StudioPostLite[];
  } catch {
    return [];
  }
}
