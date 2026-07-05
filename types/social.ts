import type { ChannelKey } from "@/lib/social/channels";

export type SocialPlatform = "youtube" | "instagram";

export const PLATFORM_META: Record<SocialPlatform, { label: string; noun: string }> = {
  youtube: { label: "YouTube", noun: "video" },
  instagram: { label: "Instagram", noun: "reel" },
};

/** Vertical short (Reels / Shorts) vs long-form landscape video. */
export type MediaFormat = "short" | "video";

export const FORMAT_META: Record<MediaFormat, { label: string; dimensions: string; ratioClass: string }> = {
  short: { label: "Short / Reel", dimensions: "1080×1920", ratioClass: "aspect-[9/16]" },
  video: { label: "Long video", dimensions: "1920×1080", ratioClass: "aspect-video" },
};

export type PostStatus =
  | "draft" // copy generated, awaiting media / review
  | "rendering" // media is being produced
  | "ready" // media ready, awaiting publish
  | "publishing" // pushing to platforms
  | "published" // at least one platform succeeded
  | "failed";

export type TargetStatus = "pending" | "publishing" | "published" | "failed" | "skipped";

export interface PlatformTarget {
  platform: SocialPlatform;
  status: TargetStatus;
  /** YouTube video id / Instagram media id once published. */
  externalId?: string;
  /** Public URL to the published post, when known. */
  url?: string;
  error?: string;
}

export type PrivacyStatus = "private" | "unlisted" | "public";

/** How the media was obtained. */
export type MediaSource = "upload" | "render";

export interface SocialPost {
  id: string;
  channelKey: ChannelKey;
  channelBrand: string;
  format: MediaFormat;
  mediaSource: MediaSource;
  /** The topic / brief the user typed. */
  brief: string;

  // AI-generated (or template) copy
  title: string;
  description: string;
  caption: string;
  hashtags: string[];
  /** Spoken narration used by the render engine (creator-written or template). */
  script?: string;

  // Media (relative to data/, served via /api/files/<path>)
  mediaPath?: string;
  thumbPath?: string;
  durationSec?: number;
  renderProgress?: number; // 0–100 while rendering
  renderStage?: string;

  privacy: PrivacyStatus;
  targets: PlatformTarget[];

  status: PostStatus;
  error?: string;

  createdAt: string;
  startedAt?: string; // render start
  renderedAt?: string;
  publishedAt?: string;
}

/** Path relative to data/ → served URL. Mirrors types/marketing.ts:fileUrl. */
export function fileUrl(relPath: string): string {
  return `/api/files/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}
