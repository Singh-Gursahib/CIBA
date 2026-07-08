import "server-only";
import type { MarketingVideoJob } from "./types";

/**
 * Video generation seam for the Marketing Studio.
 *
 * The real render pipeline (ffmpeg / an external render API) plugs in here
 * later: implement `VideoProvider` and swap the exported `videoProvider` at the
 * bottom. Demo-first, `stubProvider` is the default — it simulates a short
 * multi-stage render and resolves to the bundled sample clip.
 *
 * Progress is derived purely from elapsed time (job.startedAt) so it needs no
 * background work and survives a server restart mid-render.
 */

/** The bundled recap sample, served from public/videos. */
export const SAMPLE_VIDEO_URL = "/videos/ciba-recap.mp4";

export interface VideoPollResult {
  status: "generating" | "ready" | "failed";
  /** 0–100 */
  progress: number;
  /** Playable URL once ready. */
  url?: string;
  /** Human-readable stage label for the UI. */
  stage?: string;
}

export interface VideoProvider {
  /** Called once when a video job starts. Returns a provider-side reference. */
  start(job: MarketingVideoJob): Promise<{ providerJobId: string }>;
  /** Called on every poll — reports progress and, when done, the playable URL. */
  poll(job: MarketingVideoJob): Promise<VideoPollResult>;
}

/** A "few seconds" render, as the task asks for. */
const STUB_DURATION_MS = 6_000;

/** [progressThreshold, stageLabel] — highest reached threshold wins. */
const STAGES: [number, string][] = [
  [0, "Storyboarding scenes"],
  [20, "Composing brand visuals"],
  [45, "Rendering frames"],
  [75, "Mixing audio & captions"],
  [92, "Adding brand outro"],
];

function stageFor(progress: number): string | undefined {
  return [...STAGES].reverse().find(([threshold]) => progress >= threshold)?.[1];
}

const stubProvider: VideoProvider = {
  async start(job) {
    return { providerJobId: `stub-${job.id}` };
  },
  async poll(job) {
    const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : Date.now();
    const elapsed = Math.max(0, Date.now() - startedAt);
    const progress = Math.min(100, Math.round((elapsed / STUB_DURATION_MS) * 100));
    if (progress >= 100) {
      return { status: "ready", progress: 100, url: SAMPLE_VIDEO_URL, stage: "Ready" };
    }
    return { status: "generating", progress, stage: stageFor(progress) };
  },
};

/** Swap this for a real provider when the render pipeline lands. */
export const videoProvider: VideoProvider = stubProvider;
