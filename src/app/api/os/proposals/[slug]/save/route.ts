import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canUseGrants } from "@/lib/os/grants/access";
import { stripEmDashes } from "@/lib/os/social/sanitize";
import { saveProposalDoc, touchProposal } from "@/lib/os/grants/store";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const member = await currentMember();
  if (!member || !canUseGrants(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { slug } = await ctx.params;
  const { content } = await req.json().catch(() => ({}));
  if (typeof content !== "string") return NextResponse.json({ error: "Missing content" }, { status: 400 });
  await saveProposalDoc(slug, stripEmDashes(content));
  await touchProposal(slug);
  return NextResponse.json({ ok: true });
}
