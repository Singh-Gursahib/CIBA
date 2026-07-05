import { NextResponse } from "next/server";
import { getPost, patchPost } from "@/features/social/data";
import { publishToPlatform, platformConfigured } from "@/lib/social/publish";
import { isMockPublish } from "@/lib/config";
import { nowIso } from "@/lib/utils/dates";
import type { TargetStatus } from "@/types/social";

export const maxDuration = 300;

/**
 * Publishes a post to each selected platform, one at a time, patching each
 * target's status incrementally so a failure on one platform never loses the
 * success of another (mirrors the marketing per-format generate loop).
 * Body: { postId }.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const postId = body?.postId as string | undefined;
  if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });

  const post = await getPost(postId);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!post.mediaPath) {
    return NextResponse.json({ error: "Render or upload the media before publishing" }, { status: 400 });
  }

  const mock = isMockPublish();

  // Which targets to (re)publish: anything not already published.
  const pending = post.targets.filter((t) => t.status !== "published").map((t) => t.platform);

  await patchPost(postId, (p) => ({
    ...p,
    status: "publishing",
    error: undefined,
    targets: p.targets.map((t) =>
      pending.includes(t.platform) ? { ...t, status: "publishing" as TargetStatus, error: undefined } : t
    ),
  }));

  for (const platform of pending) {
    // In real mode, skip platforms without credentials rather than hard-failing.
    if (!mock && !platformConfigured(post.channelKey, platform)) {
      await patchPost(postId, (p) => ({
        ...p,
        targets: p.targets.map((t) =>
          t.platform === platform
            ? { ...t, status: "skipped", error: "No credentials configured for this channel" }
            : t
        ),
      }));
      continue;
    }

    try {
      const current = (await getPost(postId))!;
      const result = await publishToPlatform(platform, current);
      await patchPost(postId, (p) => ({
        ...p,
        targets: p.targets.map((t) =>
          t.platform === platform
            ? { ...t, status: "published", externalId: result.externalId, url: result.url, error: undefined }
            : t
        ),
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
      publishedAt: anyPublished ? nowIso() : p.publishedAt,
    };
  });

  return NextResponse.json({ post: finished });
}
