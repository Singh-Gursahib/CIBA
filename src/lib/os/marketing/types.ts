import type { PosterFormat } from "./poster";

export interface PosterOutput {
  format: PosterFormat;
  svg: string;
}

export interface MarketingJob {
  id: string;
  memberId: string;
  projectId?: string;
  eyebrow?: string;
  title: string;
  details?: string;
  cta?: string;
  formats: PosterFormat[];
  outputs: PosterOutput[];
  createdAt: string;
}

export type VideoAspect = "mobile" | "square" | "landscape";
export type VideoJobStatus = "generating" | "ready" | "failed";

export interface MarketingVideoJob {
  id: string;
  memberId: string;
  projectId?: string;
  title: string;
  brief?: string;
  aspect: VideoAspect;
  status: VideoJobStatus;
  /** 0–100 */
  progress: number;
  /** Human-readable render stage for the UI. */
  stage?: string;
  /** Playable URL once the render is ready. */
  videoUrl?: string;
  /** Provider-side reference (stub id in demo mode). */
  providerJobId?: string;
  createdAt: string;
  /** When the render started — progress is derived from this so it survives restarts. */
  startedAt: string;
}
