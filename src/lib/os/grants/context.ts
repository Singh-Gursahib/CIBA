// CIBA organizational context for grant fit + proposal grounding. Gursahib's
// build used a markdown knowledge base; here we ground on the OS seed data
// (real programs, partners, ventures) so claims stay factual.

import { PARTNERS, PROJECTS, VENTURES } from "@/lib/os/seed";

export const CIBA_PROFILE = [
  "CIBA (Central Interior Business Accelerator), formerly Kamloops Innovation, is a nonprofit business accelerator based at the Thompson Rivers University (TRU) campus in Kamloops, BC.",
  "It serves founders and small businesses across the Thompson, Nicola, and Cariboo regions. Executive Director: Sachin Singh.",
  "Core service areas: venture acceleration, mentorship matching, applied-AI adoption clinics, an AI Skills Accelerator, Indigenous and newcomer business development, and regional program delivery in partnership with TRU.",
  "It reports outcomes to funders in terms of ventures supported, jobs created, revenue enabled, and program participation.",
].join(" ");

/** CIBA programs/partners/ventures relevant to a grant query — for fit's relatedRefs and proposal grounding. */
export function cibaRefsForQuery(query: string, limit = 4): { id: string; label: string; href?: string; blurb: string }[] {
  const q = query.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const score = (text: string) => words.filter((w) => text.toLowerCase().includes(w)).length;

  const refs = [
    ...PROJECTS.map((p) => ({ id: p.id, label: p.name, href: `/os/projects/${p.id}`, blurb: `${p.programTag}. ${p.summary}` })),
    ...PARTNERS.map((p) => ({ id: p.id, label: p.name, blurb: `${p.kind} partner (${p.region}). ${p.about}` })),
    ...VENTURES.map((v) => ({ id: v.id, label: v.name, blurb: `${v.sector} venture, ${v.stage} stage.` })),
  ];
  return refs
    .map((r) => ({ r, s: score(r.label + " " + r.blurb) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ r }) => r);
}

/** A compact grounding block (top refs' text) for the AI context window. */
export function cibaContextBlock(query: string): string {
  const refs = cibaRefsForQuery(query, 5);
  return [CIBA_PROFILE, "", "Relevant CIBA programs, partners, and ventures:", ...refs.map((r) => `- ${r.label}: ${r.blurb}`)].join("\n");
}
