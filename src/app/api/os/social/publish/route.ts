import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canOperateSocial } from "@/lib/os/social/access";
import { getPost } from "@/lib/os/social/store";
import { runPublish } from "@/lib/os/social/run";

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
  if (post.approval !== "approved") {
    return NextResponse.json({ error: "This post needs executive approval before it can be published." }, { status: 403 });
  }

  const finished = await runPublish(postId);
  return NextResponse.json({ post: finished });
}
