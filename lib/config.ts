import path from "path";

/** Server-only typed access to env and app paths. */

export const ROOT = process.cwd();
export const DATA_DIR = path.join(ROOT, "data");
export const BRAND_DIR = path.join(ROOT, "brand");
export const CONTENT_DIR = path.join(ROOT, "content", "knowledge");

export function isMockAI(): boolean {
  return process.env.MOCK_AI !== "false";
}

export function imageQuality(): "low" | "medium" | "high" {
  const q = process.env.IMAGE_QUALITY;
  return q === "medium" || q === "high" ? q : "low";
}

export function geminiTextModel(): string {
  return process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";
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
