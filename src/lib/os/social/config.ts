// Social Studio config — mock-first, matching CIBA OS's demo-mode ethos.
// Three independent switches govern the three external stages so each can run
// real or simulated on its own. Copy defaults to demo unless an Anthropic key
// is present; render/publish default to demo unless MOCK_* is explicitly false.

import path from "node:path";
import { AI_ENABLED } from "@/lib/ai";

export const ROOT = process.cwd();
/** Runtime data lives in .data/ (gitignored), alongside the connector vault. */
export const DATA_DIR = path.join(ROOT, ".data");

/** Copy/narration: real Claude when a key is set, else deterministic template. */
export function isMockCopy(): boolean {
  if (process.env.MOCK_AI !== undefined) return process.env.MOCK_AI !== "false";
  return !AI_ENABLED;
}

/** Media rendering: real ffmpeg/TTS/Pexels engine when MOCK_RENDER=false. */
export function isMockRender(): boolean {
  if (process.env.MOCK_RENDER !== undefined) return process.env.MOCK_RENDER !== "false";
  return true; // safe default — sample video, no external calls
}

/** Publishing: posts to real YouTube/Instagram accounts when MOCK_PUBLISH=false. */
export function isMockPublish(): boolean {
  if (process.env.MOCK_PUBLISH !== undefined) return process.env.MOCK_PUBLISH !== "false";
  return true; // safe default — nothing hits real accounts
}

export function pexelsKey(): string | undefined {
  return process.env.PEXELS_API_KEY || undefined;
}

/** Public base URL where rendered mp4 is mirrored for Instagram (which pulls). */
export function videoPublicBaseUrl(): string | undefined {
  return process.env.VIDEO_PUBLIC_BASE_URL || undefined;
}

/** GitHub repo (owner/name) used as a free public CDN for Instagram media. */
export function contentCdnRepo(): string | undefined {
  return process.env.CONTENT_CDN_REPO || undefined;
}

export function contentCdnTag(): string {
  return process.env.CONTENT_CDN_TAG || "cdn";
}
