import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canUseGrants } from "@/lib/os/grants/access";
import { listProposalVersions, readProposalVersion, saveProposalDoc, snapshotProposal, touchProposal } from "@/lib/os/grants/store";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const member = await currentMember();
  if (!member || !canUseGrants(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { slug } = await ctx.params;
  const id = new URL(req.url).searchParams.get("id");
  if (id) return NextResponse.json({ content: await readProposalVersion(slug, id) });
  return NextResponse.json({ versions: await listProposalVersions(slug) });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const member = await currentMember();
  if (!member || !canUseGrants(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { slug } = await ctx.params;
  const { action, id } = await req.json().catch(() => ({}));
  if (action === "snapshot") {
    await snapshotProposal(slug);
    return NextResponse.json({ ok: true });
  }
  if (action === "restore" && id) {
    const content = await readProposalVersion(slug, id);
    if (!content) return NextResponse.json({ error: "Version not found" }, { status: 404 });
    await snapshotProposal(slug); // snapshot current before overwriting
    await saveProposalDoc(slug, content);
    await touchProposal(slug);
    return NextResponse.json({ ok: true, content });
  }
  return NextResponse.json({ error: "Bad action" }, { status: 400 });
}
