import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canOperateSocial } from "@/lib/os/social/access";
import { DATA_DIR } from "@/lib/os/social/config";
import { getPost, deletePost } from "@/lib/os/social/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await ctx.params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Own post, or executive.
  if (post.memberId !== member.id && member.role !== "executive") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (!canOperateSocial(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  return NextResponse.json({ post });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (!member || !canOperateSocial(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.memberId !== member.id && member.role !== "executive") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await fs.rm(path.join(DATA_DIR, "social", "outputs", id), { recursive: true, force: true }).catch(() => {});
  await deletePost(id);
  return NextResponse.json({ ok: true });
}
