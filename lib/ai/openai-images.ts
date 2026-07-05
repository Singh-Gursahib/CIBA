import "server-only";
import { promises as fs } from "fs";
import { createReadStream, existsSync } from "fs";
import path from "path";
import OpenAI, { toFile } from "openai";
import { BRAND_DIR, DATA_DIR, imageQuality, requireEnv } from "@/lib/config";
import { FORMAT_META, type OutputFormat } from "@/types/marketing";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  return client;
}

/** Brand logos are appended to every image request when present on disk. */
function logoPaths(): string[] {
  return ["ciba-logo.png", "tru-logo.png"]
    .map((f) => path.join(BRAND_DIR, f))
    .filter((p) => existsSync(p));
}

/**
 * Generate one poster with gpt-image-1 and return the PNG buffer.
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
    const images = await Promise.all(
      refFiles.map((p) => toFile(createReadStream(p), path.basename(p)))
    );
    const res = await openai.images.edit({
      model: "gpt-image-1",
      image: images,
      prompt: opts.prompt,
      size,
      quality,
    });
    b64 = res.data?.[0]?.b64_json;
  } else {
    const res = await openai.images.generate({
      model: "gpt-image-1",
      prompt: opts.prompt,
      size,
      quality,
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
