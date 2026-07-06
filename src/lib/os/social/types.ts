// Social Studio post model — the real, mutable content records (persisted to
// .data/social-posts.json). Distinct from the immutable seed `SocialPost` in
// ../types.ts, which drives the demo social calendar.

import type { ChannelKey } from "./channels";

export type SocialPlatform = "youtube" | "instagram" | "tiktok";

export const PLATFORM_META: Record<SocialPlatform, { label: string; noun: string; icon: string }> = {
  youtube: { label: "YouTube", noun: "video", icon: "▶" },
  instagram: { label: "Instagram", noun: "reel", icon: "◈" },
  tiktok: { label: "TikTok", noun: "video", icon: "♪" },
};

export const ALL_PLATFORMS: SocialPlatform[] = ["youtube", "instagram", "tiktok"];

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type MediaFormat = "short" | "video";

export const FORMAT_META: Record<MediaFormat, { label: string; dimensions: string }> = {
  short: { label: "Short / Reel", dimensions: "1080x1920" },
  video: { label: "Long video", dimensions: "1920x1080" },
};

export type PostStatus = "draft" | "rendering" | "ready" | "publishing" | "published" | "failed";
export type TargetStatus = "pending" | "publishing" | "published" | "failed" | "skipped";

export interface PlatformTarget {
  platform: SocialPlatform;
  status: TargetStatus;
  externalId?: string;
  url?: string;
  error?: string;
}

export type PrivacyStatus = "private" | "unlisted" | "public";
export type MediaSource = "upload" | "render";

export interface StudioPost {
  id: string;
  /** Member who created it (for scoping + attribution). */
  memberId: string;
  /** Optional CIBA collaboration this post belongs to. */
  projectId?: string;
  channelKey: ChannelKey;
  channelBrand: string;
  format: MediaFormat;
  mediaSource: MediaSource;
  brief: string;

  title: string;
  description: string;
  caption: string;
  hashtags: string[];
  script?: string;

  mediaPath?: string; // relative to .data/, served via /api/os/social/media/<path>
  thumbPath?: string;
  durationSec?: number;
  renderProgress?: number;
  renderStage?: string;

  privacy: PrivacyStatus;
  targets: PlatformTarget[];

  status: PostStatus;
  error?: string;

  // Approval workflow: Marketing drafts need an Executive sign-off before
  // anything can be published. Executive-created posts auto-approve.
  approval: ApprovalStatus;
  approvedBy?: string; // member id
  approvedAt?: string;
  rejectionReason?: string;

  /** If set, the post publishes at this time (via run-scheduled), not on create. */
  scheduledFor?: string;

  createdAt: string;
  startedAt?: string;
  renderedAt?: string;
  publishedAt?: string;
}

/** Path relative to .data/ → served URL. */
export function mediaUrl(relPath: string): string {
  return `/api/os/social/media/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}
