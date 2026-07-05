import { NextResponse } from "next/server";
import {
  listProposalVersions,
  readProposalVersion,
  snapshotProposal,
  saveProposalDoc,
  touchProposal,
} from "@/features/grants/data";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(_req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const content = await readProposalVersion(slug, id);
    if (content == null) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ content });
  }
  return NextResponse.json({ versions: await listProposalVersions(slug) });
}

/** Restore a version (snapshots current first) or create a manual snapshot. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { action, id } = (await req.json().catch(() => ({}))) as { action?: string; id?: string };

  if (action === "snapshot") {
    await snapshotProposal(slug);
    return NextResponse.json({ ok: true });
  }
  if (action === "restore" && id) {
    const content = await readProposalVersion(slug, id);
    if (content == null) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await snapshotProposal(slug); // snapshot current before overwriting
    await saveProposalDoc(slug, content);
    await touchProposal(slug);
    return NextResponse.json({ ok: true, content });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
