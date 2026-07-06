import "server-only";
import { promises as fs } from "fs";
import { createReadStream, existsSync } from "fs";
import path from "path";
import OpenAI, { toFile } from "openai";
import { BRAND_DIR, DATA_DIR, imageQuality, requireEnv } from "@/lib/config";
import { FORMAT_META, type OutputFormat } from "@/types/marketing";

let client: OpenAI | null = null;

// OpenAI image model. gpt-image-2 processes inputs at high fidelity by default
// (no input_fidelity parameter) and supports flexible sizes.
const IMAGE_MODEL = "gpt-image-2";

function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  return client;
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/** Brand logos are appended to every image request when present on disk. */
function logoPaths(): string[] {
  return ["ciba-logo.png", "ciba-logo.jpg", "tru-logo.png", "tru-logo.jpg"]
    .map((f) => path.join(BRAND_DIR, f))
    .filter((p) => existsSync(p));
}

/** Whether real logo image files are available to attach to generation. */
export function brandLogosPresent(): boolean {
  return logoPaths().length > 0;
}

/**
 * Generate one poster with gpt-image-2 and return the PNG buffer.
 * Uses images.edit when reference images exist (uploaded assets + logos),
 * otherwise falls back to pure text-to-image generation.
 */
export async function generatePoster(opts: {
  prompt: string;
  format: OutputFormat;
  /** Uploaded asset paths relative to data/ */
  assetPaths: string[];
}): Promise<Buffer> {
  const openai = getClient();
  const size = FORMAT_META[opts.format].size;
  const quality = imageQuality();

  const refFiles = [
    ...opts.assetPaths.map((p) => path.join(DATA_DIR, p)),
    ...logoPaths(),
  ].filter((p) => existsSync(p));

  let b64: string | undefined;

  if (refFiles.length > 0) {
    // Combine the uploaded assets and brand logos into one composed poster.
    const images = await Promise.all(
      refFiles.map((p) =>
        toFile(createReadStream(p), path.basename(p), {
          type: MIME[path.extname(p).toLowerCase()] ?? "image/png",
        })
      )
    );
    const res = await openai.images.edit({
      model: IMAGE_MODEL,
      image: images,
      prompt: opts.prompt,
      size,
      quality,
      n: 1,
    });
    b64 = res.data?.[0]?.b64_json;
  } else {
    const res = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt: opts.prompt,
      size,
      quality,
      n: 1,
    });
    b64 = res.data?.[0]?.b64_json;
  }

  if (!b64) throw new Error("gpt-image-1 returned no image data");
  return Buffer.from(b64, "base64");
}

export async function writeOutput(relPath: string, data: Buffer | string): Promise<void> {
  const abs = path.join(DATA_DIR, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
}
