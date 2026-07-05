import "server-only";
import type { MarketingJob } from "@/types/marketing";

/**
 * Video generation seam. The real pipeline plugs in here later:
 * implement VideoProvider and swap the export at the bottom.
 * The stub simulates a ~25 second render, deriving progress purely from
 * elapsed time so it survives server restarts and needs no background work.
 */

export interface VideoPollResult {
  status: "generating" | "ready" | "failed";
  /** 0–100 */
  progress: number;
  /** Playable URL once ready */
  url?: string;
  /** Human-readable stage label for the UI */
  stage?: string;
}

export interface VideoProvider {
  /** Called once when a video job starts. Returns provider-side job reference. */
  start(job: MarketingJob): Promise<{ providerJobId: string }>;
  /** Called on every poll. */
  poll(job: MarketingJob): Promise<VideoPollResult>;
}

const STUB_DURATION_MS = 25_000;

const STAGES: [number, string][] = [
  [0, "Storyboarding scenes"],
  [25, "Composing brand visuals"],
  [55, "Rendering frames"],
  [85, "Adding brand outro"],
];

const stubProvider: VideoProvider = {
  async start(job) {
    return { providerJobId: `stub-${job.id}` };
  },
  async poll(job) {
    const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : Date.now();
    const elapsed = Date.now() - startedAt;
    const progress = Math.min(100, Math.round((elapsed / STUB_DURATION_MS) * 100));
    if (progress >= 100) {
      return { status: "ready", progress: 100, url: "/samples/ciba-sample.mp4" };
    }
    const stage = [...STAGES].reverse().find(([threshold]) => progress >= threshold)?.[1];
    return { status: "generating", progress, stage };
  },
};

export const videoProvider: VideoProvider = stubProvider;
