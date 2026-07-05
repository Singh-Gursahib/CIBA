"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { DATA_DIR } from "@/lib/config";
import { nowIso } from "@/lib/utils/dates";
import { getChannel, type ChannelKey } from "@/lib/social/channels";
import { generateCopy } from "@/lib/social/copy";
import { insertPost, deletePost as removePost } from "@/features/social/data";
import type {
  MediaFormat,
  PlatformTarget,
  PrivacyStatus,
  SocialPlatform,
  SocialPost,
} from "@/types/social";

const MAX_MEDIA_BYTES = 300 * 1024 * 1024; // IG Reels cap
const PLATFORMS: SocialPlatform[] = ["youtube", "instagram"];

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function saveUpload(postId: string, file: File): Promise<{ mediaPath: string }> {
  const dir = path.join(DATA_DIR, "social", "outputs", postId);
  await fs.mkdir(dir, { recursive: true });
  const abs = path.join(dir, `${postId}.mp4`);
  await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()));
  return { mediaPath: `social/outputs/${postId}/${postId}.mp4` };
}

/**
 * Create a post: generate copy, attach media (uploaded file → ready to publish;
 * otherwise a render is queued), and record the selected publish targets.
 */
export async function createPost(
  formData: FormData
): Promise<{ postId: string; needsRender: boolean } | { error: string }> {
  const channelKey = String(formData.get("channelKey") ?? "") as ChannelKey;
  const channel = getChannel(channelKey);
  const brief = String(formData.get("brief") ?? "").trim();
  const format = (String(formData.get("format")) === "video" ? "video" : "short") as MediaFormat;
  const privacyRaw = String(formData.get("privacy") ?? "private");
  const privacy: PrivacyStatus =
    privacyRaw === "public" || privacyRaw === "unlisted" ? (privacyRaw as PrivacyStatus) : "private";
  const platforms = formData
    .getAll("platforms")
    .map(String)
    .filter((p): p is SocialPlatform => (PLATFORMS as string[]).includes(p));
  const script = String(formData.get("script") ?? "").trim() || undefined;
  const media = formData.get("media");
  const mediaFile = media instanceof File && media.size > 0 ? media : null;

  if (!brief) return { error: "Describe the video you want to post first." };
  if (platforms.length === 0) return { error: "Choose at least one platform to publish to." };
  if (mediaFile && mediaFile.size > MAX_MEDIA_BYTES) {
    return { error: "Video is over the 300 MB limit. Trim or re-encode it and try again." };
  }
  if (mediaFile && !mediaFile.type.startsWith("video/")) {
    return { error: "Upload a video file (mp4)." };
  }

  const postId = newId();
  const copy = await generateCopy(channel, brief, format);

  let mediaPath: string | undefined;
  if (mediaFile) ({ mediaPath } = await saveUpload(postId, mediaFile));

  const targets: PlatformTarget[] = platforms.map((platform) => ({ platform, status: "pending" }));

  const post: SocialPost = {
    id: postId,
    channelKey: channel.key,
    channelBrand: channel.brand,
    format,
    mediaSource: mediaFile ? "upload" : "render",
    brief,
    title: copy.title,
    description: copy.description,
    caption: copy.caption,
    hashtags: copy.hashtags,
    script,
    mediaPath,
    privacy,
    targets,
    status: mediaFile ? "ready" : "draft",
    createdAt: nowIso(),
    renderedAt: mediaFile ? nowIso() : undefined,
  };

  await insertPost(post);
  revalidatePath("/social");
  return { postId, needsRender: !mediaFile };
}

export async function deletePostAction(postId: string): Promise<{ ok: true } | { error: string }> {
  if (!postId) return { error: "Missing post id." };
  const dir = path.join(DATA_DIR, "social", "outputs", postId);
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  await removePost(postId);
  revalidatePath("/social");
  return { ok: true };
}
