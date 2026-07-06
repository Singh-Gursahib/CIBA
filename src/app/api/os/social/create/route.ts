import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { DATA_DIR } from "@/lib/os/social/config";
import { canOperateSocial } from "@/lib/os/social/access";
import { getChannel, type ChannelKey } from "@/lib/os/social/channels";
import { generateCopy } from "@/lib/os/social/copy";
import { insertPost } from "@/lib/os/social/store";
import { ALL_PLATFORMS, type ApprovalStatus, type MediaFormat, type PlatformTarget, type PrivacyStatus, type SocialPlatform, type StudioPost } from "@/lib/os/social/types";

export const maxDuration = 120;

const MAX_MEDIA_BYTES = 300 * 1024 * 1024;

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canOperateSocial(member)) {
    return NextResponse.json({ error: "Only Marketing and the Executive Director can create social posts." }, { status: 403 });
  }

  const form = await req.formData();
  const channelKey = String(form.get("channelKey") ?? "") as ChannelKey;
  const channel = getChannel(channelKey);
  const brief = String(form.get("brief") ?? "").trim();
  const format = (String(form.get("format")) === "video" ? "video" : "short") as MediaFormat;
  const privacyRaw = String(form.get("privacy") ?? "private");
  const privacy: PrivacyStatus = privacyRaw === "public" || privacyRaw === "unlisted" ? privacyRaw : "private";
  const projectId = String(form.get("projectId") ?? "").trim() || undefined;
  const script = String(form.get("script") ?? "").trim() || undefined;
  const scheduledForRaw = String(form.get("scheduledFor") ?? "").trim();
  const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw).toISOString() : undefined;
  const platforms = form.getAll("platforms").map(String).filter((p): p is SocialPlatform => (ALL_PLATFORMS as string[]).includes(p));
  const media = form.get("media");
  const mediaFile = media instanceof File && media.size > 0 ? media : null;

  if (!brief) return NextResponse.json({ error: "Describe the video first." }, { status: 400 });
  if (platforms.length === 0) return NextResponse.json({ error: "Choose at least one platform." }, { status: 400 });
  if (mediaFile && mediaFile.size > MAX_MEDIA_BYTES) return NextResponse.json({ error: "Video is over the 300 MB limit." }, { status: 400 });
  if (mediaFile && !mediaFile.type.startsWith("video/")) return NextResponse.json({ error: "Upload a video file (mp4)." }, { status: 400 });

  const id = newId();
  const copy = await generateCopy(channel, brief, format);

  let mediaPath: string | undefined;
  if (mediaFile) {
    const dir = path.join(DATA_DIR, "social", "outputs", id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${id}.mp4`), Buffer.from(await mediaFile.arrayBuffer()));
    mediaPath = `social/outputs/${id}/${id}.mp4`;
  }

  const targets: PlatformTarget[] = platforms.map((platform) => ({ platform, status: "pending" }));
  const now = new Date().toISOString();
  // Executives self-approve; Marketing drafts need an executive sign-off.
  const selfApprove = member.role === "executive";
  const approval: ApprovalStatus = selfApprove ? "approved" : "pending";
  const post: StudioPost = {
    id,
    memberId: member.id,
    projectId,
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
    approval,
    approvedBy: selfApprove ? member.id : undefined,
    approvedAt: selfApprove ? now : undefined,
    scheduledFor,
    createdAt: now,
    renderedAt: mediaFile ? now : undefined,
  };

  await insertPost(post);
  return NextResponse.json({ post, needsRender: !mediaFile });
}
