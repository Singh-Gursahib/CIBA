// Media render seam. Mock copies a bundled sample MP4 (zero keys); real mode
// drives the ported engine (Edge-TTS voiceover + Pexels footage + ffmpeg).
// Skipped entirely when the creator uploads their own finished file.

import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_DIR, ROOT, isMockRender, pexelsKey } from "./config";
import { generate as engineGenerate } from "./engine.mjs";
import { getChannel } from "./channels";
import { buildNarration } from "./script";
import type { StudioPost } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RenderResult {
  mediaPath: string;
  thumbPath?: string;
  durationSec: number;
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

async function mockRender(post: StudioPost, onProgress: OnProgress): Promise<RenderResult> {
  for (const [progress, stage] of MOCK_STAGES) {
    await onProgress(progress, stage);
    await sleep(1000);
  }
  const relPath = `social/outputs/${post.id}/${post.id}.mp4`;
  const abs = path.join(DATA_DIR, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.copyFile(SAMPLE_MP4, abs);
  return { mediaPath: relPath, durationSec: 25 };
}

async function realRender(post: StudioPost, onProgress: OnProgress): Promise<RenderResult> {
  const key = pexelsKey();
  if (!key) {
    throw new Error("Rendering needs PEXELS_API_KEY (free at pexels.com/api), or upload a finished video instead.");
  }
  const channel = getChannel(post.channelKey);
  const narration = await buildNarration(channel, post.brief, post.format, post.script);

  const outRel = `social/outputs/${post.id}/${post.id}.mp4`;
  const thumbRel = `social/outputs/${post.id}/${post.id}.jpg`;
  const outPath = path.join(DATA_DIR, outRel);
  const thumbPath = path.join(DATA_DIR, thumbRel);
  const workDir = path.join(DATA_DIR, "social", "work", post.id);
  await fs.mkdir(path.dirname(outPath), { recursive: true });

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

  const thumbExists = await fs.access(thumbPath).then(() => true).catch(() => false);
  return {
    mediaPath: outRel,
    thumbPath: thumbExists ? thumbRel : undefined,
    durationSec: Math.round(result?.durationSec ?? 0),
    script: narration.text,
  };
}

export async function renderMedia(post: StudioPost, onProgress: OnProgress): Promise<RenderResult> {
  return isMockRender() ? mockRender(post, onProgress) : realRender(post, onProgress);
}
