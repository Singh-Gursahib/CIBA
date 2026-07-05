import { NextResponse } from "next/server";
import { isMockAI } from "@/lib/config";
import { generateText } from "@/lib/ai/gemini";
import { stripEmDashes } from "@/lib/ai/sanitize";
import { mockProposal } from "@/lib/ai/mock-proposal";
import { proposalSystemPrompt, proposalUserPrompt } from "@/lib/ai/prompts/proposal";
import { getDoc } from "@/lib/content/loader";
import { nowIso } from "@/lib/utils/dates";
import { slugify } from "@/lib/utils/slugify";
import {
  getDiscovery,
  listOrgs,
  patchDiscovery,
  saveProposalAnswers,
  saveProposalDoc,
  upsertProposalMeta,
} from "@/features/grants/data";
import type { ProposalMeta } from "@/types/grants";

export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    discoveryId?: string;
    answers?: Record<string, string>;
    title?: string;
  };
  const discovery = body.discoveryId ? await getDiscovery(body.discoveryId) : undefined;
  if (!discovery) return NextResponse.json({ error: "Discovery not found" }, { status: 404 });

  const answers = body.answers ?? {};
  const orgs = await listOrgs();
  const orgName = orgs.find((o) => o.id === discovery.orgId)?.name;
  const title =
    (body.title && body.title.trim()) ||
    Object.entries(answers).find(([q]) => q.toLowerCase().includes("title"))?.[1] ||
    `Proposal for ${discovery.title}`;
  const slug = `${slugify(title)}-${Date.now().toString(36).slice(-4)}`;

  let markdown: string;
  if (isMockAI()) {
    markdown = mockProposal({ discovery, answers, title });
  } else {
    const related = discovery.fit?.relatedDocs ?? [];
    const docs = (await Promise.all(related.slice(0, 3).map((r) => getDoc(r.slug)))).filter(
      (d): d is NonNullable<typeof d> => !!d
    );
    const context = docs.map((d) => `## ${d.title}\n${d.content.slice(0, 2200)}`).join("\n\n");
    const raw = await generateText({
      system: proposalSystemPrompt(),
      contents: [{ role: "user", parts: [{ text: proposalUserPrompt({ discovery, answers, context }) }] }],
      temperature: 0.6,
    });
    markdown = raw;
  }

  // Guarantee: no em dashes, whatever the model did.
  markdown = stripEmDashes(markdown);

  await saveProposalDoc(slug, markdown);
  await saveProposalAnswers(slug, answers);

  const meta: ProposalMeta = {
    slug,
    title,
    discoveryId: discovery.id,
    orgName,
    grantTitle: discovery.title,
    status: "draft",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await upsertProposalMeta(meta);
  await patchDiscovery(discovery.id, { status: "proposal_started" });

  return NextResponse.json({ slug, meta });
}
