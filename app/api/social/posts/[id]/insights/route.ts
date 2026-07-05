import { NextResponse } from "next/server";
import { getPost } from "@/features/social/data";
import { getPostInsights } from "@/lib/social/stats";

export const maxDuration = 60;

/** On-demand performance for a published post, across its platforms. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const insights = await getPostInsights(post);
  return NextResponse.json({ insights });
}
