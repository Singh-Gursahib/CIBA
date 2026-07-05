import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canOperateSocial } from "@/lib/os/social/access";
import { getPost, patchPost } from "@/lib/os/social/store";
import { renderMedia } from "@/lib/os/social/render";

export const maxDuration = 300;

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canOperateSocial(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const { postId } = await req.json().catch(() => ({}));
  if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });
  const post = await getPost(postId);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.mediaSource !== "render") return NextResponse.json({ error: "This post already has media" }, { status: 400 });

  const now = new Date().toISOString();
  await patchPost(postId, { status: "rendering", startedAt: now, renderProgress: 0, renderStage: "Starting", error: undefined });

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
      renderedAt: new Date().toISOString(),
    }));
    return NextResponse.json({ post: finished });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Render failed";
    const failed = await patchPost(postId, { status: "failed", error: message, renderStage: undefined });
    return NextResponse.json({ post: failed }, { status: 500 });
  }
}
