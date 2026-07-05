import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canOperateSocial, visibleStudioPosts } from "@/lib/os/social/access";
import { listPosts } from "@/lib/os/social/store";

/** List the Social Studio posts visible to the signed-in member. */
export async function GET() {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canOperateSocial(member)) return NextResponse.json({ posts: [] });
  const posts = visibleStudioPosts(member, await listPosts());
  return NextResponse.json({ posts });
}
