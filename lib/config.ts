import path from "path";

/** Server-only typed access to env and app paths. */

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, "data");
export const BRAND_DIR = path.join(ROOT, "brand");
export const CONTENT_DIR = path.join(ROOT, "content", "knowledge");

// API keys come from the environment (.env.local). When a key is present the
// matching feature runs live; when it is absent, that feature falls back to
// mock/fixture mode so the app still works with no credentials.
export function geminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined;
}

export function openaiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

/** Text AI (Gemini) runs live when GEMINI_API_KEY is set, otherwise mock. */
export function isMockText(): boolean {
  return !geminiKey();
}

/** Image generation (gpt-image-2) runs live when OPENAI_API_KEY is set, otherwise mock. */
export function isMockImages(): boolean {
  return !openaiKey();
}

export function imageQuality(): "low" | "medium" | "high" {
  const q = process.env.IMAGE_QUALITY;
  // Default to high for crisp, legible text on formal marketing material.
  return q === "low" || q === "medium" ? q : "high";
}

export function geminiTextModel(): string {
  return process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";
}

export function requireEnv(name: "OPENAI_API_KEY" | "GEMINI_API_KEY"): string {
  const value = name === "GEMINI_API_KEY" ? geminiKey() : openaiKey();
  if (!value) {
    throw new Error(`${name} is not set. Add it to ciba-os/.env.local (see .env.example).`);
  }
  return value;
}
