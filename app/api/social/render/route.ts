import { NextResponse } from "next/server";
import { getPost, patchPost } from "@/features/social/data";
import { renderMedia } from "@/lib/social/render";
import { nowIso } from "@/lib/utils/dates";

export const maxDuration = 300;

/**
 * Renders the media for a post, updating renderProgress/renderStage on the
 * record as it goes so the client can poll live progress. Body: { postId }.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const postId = body?.postId as string | undefined;
  if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });

  const post = await getPost(postId);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.mediaSource !== "render") {
    return NextResponse.json({ error: "This post already has uploaded media" }, { status: 400 });
  }

  await patchPost(postId, {
    status: "rendering",
    startedAt: nowIso(),
    renderProgress: 0,
    renderStage: "Starting",
    error: undefined,
  });

  try {
    const result = await renderMedia(post, async (progress, stage) => {
      await patchPost(postId, { renderProgress: progress, renderStage: stage });
    });
    const finished = await patchPost(postId, (p) => ({
      ...p,
      status: "ready",
      mediaPath: result.mediaPath,
      thumbPath: result.thumbPath,
      durationSec: result.durationSec,
      script: result.script ?? p.script,
      renderProgress: 100,
      renderStage: undefined,
      renderedAt: nowIso(),
    }));
    return NextResponse.json({ post: finished });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    const failed = await patchPost(postId, { status: "failed", error: message, renderStage: undefined });
    return NextResponse.json({ post: failed }, { status: 500 });
  }
}
