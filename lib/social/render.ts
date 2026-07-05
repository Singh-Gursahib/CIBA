import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR, ROOT, isMockRender, pexelsKey } from "@/lib/config";
import { sleep } from "@/lib/ai/mock";
import { generate as engineGenerate } from "./engine.mjs";
import { getChannel } from "@/lib/social/channels";
import { buildNarration } from "@/lib/social/script";
import type { SocialPost } from "@/types/social";

/**
 * Media render seam. Mock produces a bundled sample MP4 so the whole compose →
 * render → publish flow works with zero keys. Real mode drives the ported
 * LeadFlow engine (engine.mjs): Edge-TTS voiceover → Pexels stock footage →
 * ffmpeg render with karaoke captions and a brand end-card.
 *
 * When the creator uploads their own finished MP4, the render step is skipped
 * entirely (see features/social/actions.ts) and this is never called.
 */

export interface RenderResult {
  /** Path relative to data/, served via /api/files/<path>. */
  mediaPath: string;
  thumbPath?: string;
  durationSec: number;
  /** The narration actually used (creator-written or generated). */
  script?: string;
}

export type OnProgress = (progress: number, stage: string) => Promise<void>;

const MOCK_STAGES: [number, string][] = [
  [10, "Writing the script"],
  [35, "Generating voiceover"],
  [60, "Pulling stock footage"],
  [85, "Rendering and captioning"],
  [100, "Finishing up"],
];

const SAMPLE_MP4 = path.join(ROOT, "public", "samples", "ciba-sample.mp4");

async function mockRender(post: SocialPost, onProgress: OnProgress): Promise<RenderResult> {
  for (const [progress, stage] of MOCK_STAGES) {
    await onProgress(progress, stage);
    await sleep(1200);
  }
  const relPath = `social/outputs/${post.id}/${post.id}.mp4`;
  const abs = path.join(DATA_DIR, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.copyFile(SAMPLE_MP4, abs);
  return { mediaPath: relPath, durationSec: 25 };
}

async function realRender(post: SocialPost, onProgress: OnProgress): Promise<RenderResult> {
  const key = pexelsKey();
  if (!key) {
    throw new Error(
      "Rendering needs PEXELS_API_KEY (free at pexels.com/api). Set it, or upload a finished video instead."
    );
  }
  const channel = getChannel(post.channelKey);
  const narration = await buildNarration(channel, post.brief, post.format, post.script);

  const outRel = `social/outputs/${post.id}/${post.id}.mp4`;
  const thumbRel = `social/outputs/${post.id}/${post.id}.jpg`;
  const outPath = path.join(DATA_DIR, outRel);
  const thumbPath = path.join(DATA_DIR, thumbRel);
  const workDir = path.join(DATA_DIR, "social", "work", post.id);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  // The engine logs stage lines synchronously; surface them as progress. It has
  // no numeric progress, so we ramp an estimate across its stages.
  let ramp = 10;
  const bump = (line: string) => {
    ramp = Math.min(92, ramp + 6);
    void onProgress(ramp, String(line).slice(0, 80));
  };
  await onProgress(8, "Preparing render");

  const result = await engineGenerate({
    mode: post.format,
    voice: narration.voice,
    text: narration.text,
    queries: narration.queries,
    outPath,
    thumbPath,
    thumbText: post.title,
    pexelsKey: key,
    pixabayKey: process.env.PIXABAY_API_KEY,
    workDir,
    brand: channel.brand,
    ctaText: channel.ctaText,
    ctaSub: channel.ctaSub,
    log: bump,
  });

  const thumbExists = await fs
    .access(thumbPath)
    .then(() => true)
    .catch(() => false);

  return {
    mediaPath: outRel,
    thumbPath: thumbExists ? thumbRel : undefined,
    durationSec: Math.round(result?.durationSec ?? 0),
    script: narration.text,
  };
}

/** Produce the media file for a post. */
export async function renderMedia(post: SocialPost, onProgress: OnProgress): Promise<RenderResult> {
  return isMockRender() ? mockRender(post, onProgress) : realRender(post, onProgress);
}
