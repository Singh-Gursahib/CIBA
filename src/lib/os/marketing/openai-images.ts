import "server-only";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import { FORMAT_META, type PosterFormat } from "./poster";

// Real AI poster generation via OpenAI gpt-image. This is used ONLY when an
// OpenAI key is configured and mock mode is off; otherwise the deterministic
// SVG generator in poster.ts remains the default (zero keys, zero cost).

// gpt-image-1 image model. Supports 1024x1024, 1024x1536, 1536x1024 and auto.
const IMAGE_MODEL = "gpt-image-1";

/** Brand logos live under public/brand and are attached to every request. */
const BRAND_DIR = path.join(process.cwd(), "public", "brand");

let client: OpenAI | null = null;

function openaiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

/**
 * Real image generation runs when an OpenAI key is present AND mock mode is off.
 * MOCK_IMAGES defaults follow the app's demo-first ethos: with a key present it
 * runs live unless MOCK_IMAGES=true is set explicitly.
 */
export function isRealImageEnabled(): boolean {
  if (!openaiKey()) return false;
  if (process.env.MOCK_IMAGES === "true") return false;
  return true;
}

function getClient(): OpenAI {
  if (!client) {
    const apiKey = openaiKey();
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
    client = new OpenAI({ apiKey });
  }
  return client;
}

/** IMAGE_QUALITY env: low | medium | high (default low). */
function imageQuality(): "low" | "medium" | "high" {
  const q = process.env.IMAGE_QUALITY;
  return q === "medium" || q === "high" ? q : "low";
}

/** Map a poster format to the nearest gpt-image-1 supported size. */
function imageSize(format: PosterFormat): "1024x1024" | "1024x1536" | "1536x1024" {
  const { w, h } = FORMAT_META[format];
  if (w === h) return "1024x1024";
  return w > h ? "1536x1024" : "1024x1536";
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/** Brand logo files present on disk, attached as generation references. */
function logoPaths(): string[] {
  return ["ciba-logo.png", "ciba-logo.jpg", "tru-logo.png", "tru-logo.jpg"]
    .map((f) => path.join(BRAND_DIR, f))
    .filter((p) => existsSync(p));
}

/** Whether any brand logo image is available to attach to generation. */
export function brandLogosPresent(): boolean {
  return logoPaths().length > 0;
}

/**
 * Generate one poster with gpt-image-1 and return the PNG buffer. When brand
 * logos exist on disk they are attached as reference images via images.edit so
 * the model composes them into the poster; otherwise it falls back to pure
 * text-to-image generation.
 */
export async function generatePosterImage(prompt: string, format: PosterFormat): Promise<Buffer> {
  const openai = getClient();
  const size = imageSize(format);
  const quality = imageQuality();

  const refFiles = logoPaths();
  let b64: string | undefined;

  if (refFiles.length > 0) {
    const images = await Promise.all(
      refFiles.map((p) =>
        toFile(createReadStream(p), path.basename(p), {
          type: MIME[path.extname(p).toLowerCase()] ?? "image/png",
        }),
      ),
    );
    const res = await openai.images.edit({
      model: IMAGE_MODEL,
      image: images,
      prompt,
      size,
      quality,
      n: 1,
    });
    b64 = res.data?.[0]?.b64_json;
  } else {
    const res = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size,
      quality,
      n: 1,
    });
    b64 = res.data?.[0]?.b64_json;
  }

  if (!b64) throw new Error("gpt-image-1 returned no image data");
  return Buffer.from(b64, "base64");
}
