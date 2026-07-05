import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canOperateSocial } from "@/lib/os/social/access";
import { getPost, patchPost } from "@/lib/os/social/store";
import { publishToPlatform, platformConfigured } from "@/lib/os/social/publish";
import { isMockPublish } from "@/lib/os/social/config";
import type { TargetStatus } from "@/lib/os/social/types";

export const maxDuration = 300;

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canOperateSocial(member)) return NextResponse.json({ error: "Only Marketing and the Executive Director can publish." }, { status: 403 });

  const { postId } = await req.json().catch(() => ({}));
  if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });
  const post = await getPost(postId);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!post.mediaPath) return NextResponse.json({ error: "Render or upload media before publishing" }, { status: 400 });

  const mock = isMockPublish();
  const pending = post.targets.filter((t) => t.status !== "published").map((t) => t.platform);

  await patchPost(postId, (p) => ({
    ...p,
    status: "publishing",
    error: undefined,
    targets: p.targets.map((t) => (pending.includes(t.platform) ? { ...t, status: "publishing" as TargetStatus, error: undefined } : t)),
  }));

  for (const platform of pending) {
    if (!mock && !platformConfigured(post.channelKey, platform)) {
      await patchPost(postId, (p) => ({
        ...p,
        targets: p.targets.map((t) => (t.platform === platform ? { ...t, status: "skipped", error: "No credentials for this channel" } : t)),
      }));
      continue;
    }
    try {
      const current = (await getPost(postId))!;
      const result = await publishToPlatform(platform, current);
      await patchPost(postId, (p) => ({
        ...p,
        targets: p.targets.map((t) => (t.platform === platform ? { ...t, status: "published", externalId: result.externalId, url: result.url, error: undefined } : t)),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      await patchPost(postId, (p) => ({
        ...p,
        targets: p.targets.map((t) => (t.platform === platform ? { ...t, status: "failed", error: message } : t)),
      }));
    }
  }

  const finished = await patchPost(postId, (p) => {
    const anyPublished = p.targets.some((t) => t.status === "published");
    const firstError = p.targets.find((t) => t.status === "failed")?.error;
    return {
      ...p,
      status: anyPublished ? "published" : "failed",
      error: anyPublished ? undefined : firstError ?? "All platforms failed",
      publishedAt: anyPublished ? new Date().toISOString() : p.publishedAt,
    };
  });
  return NextResponse.json({ post: finished });
}
