// Publish seam. Mock returns fake ids after a delay (zero keys); real mode uses
// the ported YouTube (direct upload) and Instagram (public-URL Reel) modules.

import path from "node:path";
import { execFileSync } from "node:child_process";
import { DATA_DIR, isMockPublish, videoPublicBaseUrl, contentCdnRepo, contentCdnTag } from "./config";
import { getChannel, channelCreds, type ChannelKey } from "./channels";
import { isYouTubeConfigured, publishToYouTube } from "./youtube";
import { isInstagramConfigured, publishReel } from "./instagram";
import { isTikTokConfigured, tiktokCreds, publishTikTok } from "./tiktok";
import type { SocialPlatform, StudioPost } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface PublishResult {
  externalId: string;
  url?: string;
}

export function platformConfigured(channelKey: ChannelKey, platform: SocialPlatform): boolean {
  const channel = getChannel(channelKey);
  const creds = channelCreds(channel);
  if (platform === "youtube") return isYouTubeConfigured(creds.youtube);
  if (platform === "instagram") return isInstagramConfigured(creds.instagram);
  return isTikTokConfigured(tiktokCreds(channel.envPrefix));
}

function withHashtags(text: string, hashtags: string[]): string {
  return hashtags.length ? `${text}\n\n${hashtags.join(" ")}` : text;
}

function mockId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function publishYouTube(post: StudioPost, mediaAbs: string): Promise<PublishResult> {
  const creds = channelCreds(getChannel(post.channelKey)).youtube;
  const tags = post.hashtags.map((h) => h.replace(/^#/, ""));
  const id = await publishToYouTube(
    {
      filePath: mediaAbs,
      title: post.title,
      description: withHashtags(post.description, post.hashtags),
      tags,
      privacyStatus: post.privacy,
      categoryId: post.channelKey === "speedmania" || post.channelKey === "goalmania" ? "17" : "28",
    },
    creds,
  );
  const url = post.format === "short" ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
  return { externalId: id, url };
}

function mediaPublicUrl(mediaAbs: string, mediaRel: string): string {
  const repo = contentCdnRepo();
  const fileName = path.basename(mediaAbs);
  if (repo) {
    execFileSync("gh", ["release", "upload", contentCdnTag(), mediaAbs, "--repo", repo, "--clobber"], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    return `https://github.com/${repo}/releases/download/${contentCdnTag()}/${encodeURIComponent(fileName)}`;
  }
  const base = videoPublicBaseUrl();
  if (base) return `${base.replace(/\/$/, "")}/${mediaRel}`;
  throw new Error(
    "Instagram needs a public video URL. Set CONTENT_CDN_REPO (GitHub, uses the gh CLI) or VIDEO_PUBLIC_BASE_URL, or publish to YouTube only.",
  );
}

async function publishInstagram(post: StudioPost): Promise<PublishResult> {
  if (!post.mediaPath) throw new Error("No media to publish.");
  if (post.format !== "short") {
    throw new Error("Instagram Reels are vertical shorts only. Switch the format to a short, or publish to YouTube.");
  }
  const mediaAbs = path.join(DATA_DIR, post.mediaPath);
  const videoUrl = mediaPublicUrl(mediaAbs, post.mediaPath);
  const creds = channelCreds(getChannel(post.channelKey)).instagram;
  const id = await publishReel({ videoUrl, caption: withHashtags(post.caption, post.hashtags), shareToFeed: true }, creds);
  return { externalId: id };
}

async function publishTiktok(post: StudioPost): Promise<PublishResult> {
  if (!post.mediaPath) throw new Error("No media to publish.");
  const mediaAbs = path.join(DATA_DIR, post.mediaPath);
  const videoUrl = mediaPublicUrl(mediaAbs, post.mediaPath);
  const creds = tiktokCreds(getChannel(post.channelKey).envPrefix);
  const id = await publishTikTok({ videoUrl, title: withHashtags(post.caption, post.hashtags) }, creds);
  return { externalId: id };
}

export async function publishToPlatform(platform: SocialPlatform, post: StudioPost): Promise<PublishResult> {
  if (isMockPublish()) {
    await sleep(1400);
    if (platform === "youtube") {
      const id = mockId("ytmock");
      return { externalId: id, url: `https://www.youtube.com/watch?v=${id}` };
    }
    if (platform === "instagram") {
      const id = mockId("igmock");
      return { externalId: id, url: `https://www.instagram.com/reel/${id}` };
    }
    const id = mockId("ttmock");
    return { externalId: id, url: `https://www.tiktok.com/@ciba/video/${id}` };
  }
  if (!post.mediaPath) throw new Error("No media to publish.");
  if (platform === "youtube") return publishYouTube(post, path.join(DATA_DIR, post.mediaPath));
  if (platform === "instagram") return publishInstagram(post);
  return publishTiktok(post);
}
