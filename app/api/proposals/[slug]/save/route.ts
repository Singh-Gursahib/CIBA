import { NextResponse } from "next/server";
import { stripEmDashes } from "@/lib/ai/sanitize";
import { saveProposalDoc, touchProposal } from "@/features/grants/data";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { content } = (await req.json().catch(() => ({}))) as { content?: string };
  if (typeof content !== "string") {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }
  await saveProposalDoc(slug, stripEmDashes(content));
  await touchProposal(slug);
  return NextResponse.json({ ok: true });
}
