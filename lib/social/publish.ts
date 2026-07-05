import "server-only";
import path from "path";
import { execFileSync } from "child_process";
import {
  DATA_DIR,
  isMockPublish,
  videoPublicBaseUrl,
  contentCdnRepo,
  contentCdnTag,
} from "@/lib/config";
import { sleep } from "@/lib/ai/mock";
import { getChannel, channelCreds, type ChannelKey } from "@/lib/social/channels";
import { isYouTubeConfigured, publishToYouTube } from "@/lib/social/youtube";
import { isInstagramConfigured, publishReel } from "@/lib/social/instagram";
import type { SocialPlatform, SocialPost } from "@/types/social";

export interface PublishResult {
  externalId: string;
  url?: string;
}

/** Whether a platform has real credentials for a channel (used to gate the UI). */
export function platformConfigured(channelKey: ChannelKey, platform: SocialPlatform): boolean {
  const creds = channelCreds(getChannel(channelKey));
  return platform === "youtube" ? isYouTubeConfigured(creds.youtube) : isInstagramConfigured(creds.instagram);
}

/** Full description / caption with the channel hashtags appended. */
function withHashtags(text: string, hashtags: string[]): string {
  return hashtags.length ? `${text}\n\n${hashtags.join(" ")}` : text;
}

function mockId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function publishYouTube(post: SocialPost, mediaAbs: string): Promise<PublishResult> {
  const creds = channelCreds(getChannel(post.channelKey)).youtube;
  const tags = post.hashtags.map((h) => h.replace(/^#/, ""));
  const id = await publishToYouTube(
    {
      filePath: mediaAbs,
      title: post.title,
      description: withHashtags(post.description, post.hashtags),
      tags,
      privacyStatus: post.privacy,
      categoryId: post.channelKey === "embertide" ? "28" : "17", // 28 Sci/Tech, 17 Sports
    },
    creds
  );
  const url = post.format === "short" ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`;
  return { externalId: id, url };
}

/**
 * Instagram downloads the reel from a public URL (it cannot receive a stream).
 * Two free ways to provide one, matching the LeadFlow pipeline:
 *   (a) CONTENT_CDN_REPO → upload the mp4 to a public GitHub Release via `gh`.
 *   (b) VIDEO_PUBLIC_BASE_URL → a bucket you mirror data/social/ to yourself.
 */
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
    "Instagram needs a public video URL. Set CONTENT_CDN_REPO (a GitHub repo, uses the gh CLI) " +
      "or VIDEO_PUBLIC_BASE_URL (a bucket serving data/social/), or publish to YouTube only."
  );
}

async function publishInstagram(post: SocialPost): Promise<PublishResult> {
  if (!post.mediaPath) throw new Error("No media to publish.");
  if (post.format !== "short") {
    throw new Error("Instagram Reels are vertical shorts only. Switch the format to a short, or publish to YouTube.");
  }
  const mediaAbs = path.join(DATA_DIR, post.mediaPath);
  const videoUrl = mediaPublicUrl(mediaAbs, post.mediaPath);
  const creds = channelCreds(getChannel(post.channelKey)).instagram;
  const id = await publishReel(
    { videoUrl, caption: withHashtags(post.caption, post.hashtags), shareToFeed: true },
    creds
  );
  return { externalId: id }; // IG permalink needs a follow-up fetch; store the media id
}

/**
 * Publish a post's media to one platform. Mock mode returns a fake id/url after
 * a short delay so the flow is testable with no keys; real mode uses the ported
 * YouTube (direct upload) and Instagram (public-URL Reel) integrations.
 */
export async function publishToPlatform(platform: SocialPlatform, post: SocialPost): Promise<PublishResult> {
  if (isMockPublish()) {
    await sleep(1600);
    if (platform === "youtube") {
      const id = mockId("ytmock");
      return { externalId: id, url: `https://www.youtube.com/watch?v=${id}` };
    }
    const id = mockId("igmock");
    return { externalId: id, url: `https://www.instagram.com/reel/${id}` };
  }

  if (!post.mediaPath) throw new Error("No media to publish.");
  if (platform === "youtube") {
    const mediaAbs = path.join(DATA_DIR, post.mediaPath);
    return publishYouTube(post, mediaAbs);
  }
  return publishInstagram(post);
}
