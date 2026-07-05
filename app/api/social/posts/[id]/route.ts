import { NextResponse } from "next/server";
import { getPost } from "@/features/social/data";

/** Poll endpoint for a single post's live status. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}
