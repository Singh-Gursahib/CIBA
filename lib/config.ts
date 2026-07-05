import path from "path";

/** Server-only typed access to env and app paths. */

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, "data");
export const BRAND_DIR = path.join(ROOT, "brand");
export const CONTENT_DIR = path.join(ROOT, "content", "knowledge");

export function isMockAI(): boolean {
  return process.env.MOCK_AI !== "false";
}

/**
 * Whether social publishing is mocked (fake post ids, nothing hits real
 * accounts). Independent of MOCK_AI so you can keep copy/render on the free
 * template path while publishing for real: set MOCK_PUBLISH=false. When
 * MOCK_PUBLISH is unset it follows MOCK_AI.
 */
export function isMockPublish(): boolean {
  if (process.env.MOCK_PUBLISH !== undefined) return process.env.MOCK_PUBLISH !== "false";
  return isMockAI();
}

/**
 * Whether media rendering is mocked (bundled sample instead of the real
 * ffmpeg/TTS/stock-footage engine). Independent of MOCK_AI so you can render
 * for real while keeping copy on the template path: set MOCK_RENDER=false.
 * Requires PEXELS_API_KEY. When unset it follows MOCK_AI.
 */
export function isMockRender(): boolean {
  if (process.env.MOCK_RENDER !== undefined) return process.env.MOCK_RENDER !== "false";
  return isMockAI();
}

export function pexelsKey(): string | undefined {
  return process.env.PEXELS_API_KEY || undefined;
}

/** GitHub repo (owner/name) used as a free public CDN for Instagram media. */
export function contentCdnRepo(): string | undefined {
  return process.env.CONTENT_CDN_REPO || undefined;
}

export function contentCdnTag(): string {
  return process.env.CONTENT_CDN_TAG || "cdn";
}

export function imageQuality(): "low" | "medium" | "high" {
  const q = process.env.IMAGE_QUALITY;
  return q === "medium" || q === "high" ? q : "low";
}

export function geminiTextModel(): string {
  return process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";
}

/**
 * Public base URL where rendered social media (mp4) is mirrored so Instagram
 * can download it (Meta pulls the video from a public https URL — it will not
 * accept a stream). Point this at an R2/S3/Blob bucket that serves data/social/.
 * Not needed in mock mode or for YouTube (which uploads bytes directly).
 */
export function videoPublicBaseUrl(): string | undefined {
  return process.env.VIDEO_PUBLIC_BASE_URL || undefined;
}

export function requireEnv(name: "OPENAI_API_KEY" | "GEMINI_API_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it to ciba-os/.env.local (see .env.example), or set MOCK_AI=true to work without keys.`
    );
  }
  return value;
}
