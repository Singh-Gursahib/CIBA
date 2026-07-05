import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canOperateSocial } from "@/lib/os/social/access";
import { getPost } from "@/lib/os/social/store";
import { getPostInsights } from "@/lib/os/social/stats";

export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canOperateSocial(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.memberId !== member.id && member.role !== "executive") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const insights = await getPostInsights(post);
  return NextResponse.json({ insights });
}
