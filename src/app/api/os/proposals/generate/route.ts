import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canUseGrants } from "@/lib/os/grants/access";
import { getDiscovery, patchDiscovery, saveProposalAnswers, saveProposalDoc, upsertProposalMeta } from "@/lib/os/grants/store";
import { generateProposalMarkdown } from "@/lib/os/grants/ai";

export const maxDuration = 300;

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "proposal";
}

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member || !canUseGrants(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const discovery = await getDiscovery(body?.discoveryId);
  if (!discovery) return NextResponse.json({ error: "Discovery not found" }, { status: 404 });

  const answers: Record<string, string> = body?.answers ?? {};
  const title = (body?.title || answers["program-name"] || `Proposal for ${discovery.title}`).slice(0, 120);
  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const markdown = await generateProposalMarkdown(discovery, answers);
  await saveProposalDoc(slug, markdown);
  await saveProposalAnswers(slug, answers);
  await upsertProposalMeta({
    slug,
    title,
    discoveryId: discovery.id,
    orgName: discovery.orgName,
    grantTitle: discovery.title,
    status: "draft",
    createdBy: member.id,
    createdAt: now,
    updatedAt: now,
  });
  await patchDiscovery(discovery.id, { status: "proposal_started" });
  return NextResponse.json({ slug });
}
