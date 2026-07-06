// CIBA knowledge base — an internal markdown corpus with [[wikilinks]]. Seeded
// with real CIBA reference material; the assistant and staff read from it.

export type DocType = "playbook" | "program" | "partner" | "policy" | "reference";

export interface KnowledgeDoc {
  slug: string;
  title: string;
  type: DocType;
  tags: string[];
  summary: string;
  updated: string;
  content: string; // markdown; [[Title]] links to other docs
}

export const DOCS: KnowledgeDoc[] = [
  {
    slug: "about-ciba",
    title: "About CIBA",
    type: "reference",
    tags: ["overview", "mission"],
    updated: "2026-06-20",
    summary: "What CIBA is, who it serves, and how it measures impact.",
    content:
      "# About CIBA\n\nThe Central Interior Business Accelerator (CIBA), formerly Kamloops Innovation, is a nonprofit accelerator based at the Thompson Rivers University campus in Kamloops, BC. It serves founders and small businesses across the Thompson, Nicola, and Cariboo regions.\n\nCIBA reports outcomes to funders in ventures supported, jobs created, revenue enabled, and program participation. See [[Impact Reporting Playbook]] and [[Funder Relationships]].\n\nCore programs include the [[AI Skills Accelerator]], applied-AI adoption clinics, mentorship matching, and Indigenous and newcomer business development.",
  },
  {
    slug: "ai-skills-accelerator",
    title: "AI Skills Accelerator",
    type: "program",
    tags: ["program", "ai", "cohort"],
    updated: "2026-06-28",
    summary: "CIBA's flagship applied-AI program for local SMBs, delivered with TRU talent.",
    content:
      "# AI Skills Accelerator\n\nA cohort-based program that helps local SMBs adopt practical AI, pairing them with mentors and TRU talent to ship a real first project.\n\nEach cohort runs 12 weeks. Participants complete an [[AI-Readiness Assessment]], scope a first project, and deliver a working result by demo day.\n\nSponsored in part by KPMG. Aligns with [[Funder Relationships]] priorities around skills and adoption. Marketing assets are produced in the Marketing Studio.",
  },
  {
    slug: "ai-readiness-assessment",
    title: "AI-Readiness Assessment",
    type: "reference",
    tags: ["ai", "intake", "tool"],
    updated: "2026-06-15",
    summary: "The 5-question assessment that scores an SMB's readiness and recommends first projects.",
    content:
      "# AI-Readiness Assessment\n\nA short assessment that scores a business 0-100 on AI readiness and recommends the highest-value first opportunities by effort and impact.\n\nIt doubles as a lead magnet for the [[AI Skills Accelerator]]. Results are industry-aware: a bakery and a law firm get different recommendations.",
  },
  {
    slug: "impact-reporting-playbook",
    title: "Impact Reporting Playbook",
    type: "playbook",
    tags: ["reporting", "funders", "kpi"],
    updated: "2026-07-01",
    summary: "How CIBA collects and reports ventures, jobs, and revenue to funders.",
    content:
      "# Impact Reporting Playbook\n\nCIBA reports four headline metrics to funders: ventures supported, jobs created, revenue enabled, and program participation.\n\nData is collected per venture through the CRM and validated quarterly. Report deadlines are tracked on the Finance deadline radar. See [[Funder Relationships]] for funder-specific requirements.\n\nEvery claim in a grant proposal must trace to a source in this system. Proposals are drafted in the Grants module.",
  },
  {
    slug: "funder-relationships",
    title: "Funder Relationships",
    type: "partner",
    tags: ["funders", "grants"],
    updated: "2026-06-30",
    summary: "CIBA's core funders and what each one prioritizes in applications.",
    content:
      "# Funder Relationships\n\nCIBA's core funders include PacifiCan, Innovate BC, ETSI-BC, the Discovery Foundation, and the Women's Enterprise Centre.\n\n- PacifiCan: regional economic impact, KPIs, inclusive reach.\n- Innovate BC: innovation, youth and first-job outcomes, ecosystem partnerships.\n- ETSI-BC: economic diversification in the Southern Interior. Always referred to as the funder, never a partner.\n- Discovery Foundation: AI/tech education and adoption.\n- Women's Enterprise Centre: women-led business outcomes.\n\nUse the Grants locator to find open programs, then draft with the funder emphasis in mind. See [[Impact Reporting Playbook]].",
  },
  {
    slug: "brand-voice",
    title: "Brand & Voice Guidelines",
    type: "policy",
    tags: ["brand", "marketing", "style"],
    updated: "2026-06-10",
    summary: "CIBA's colors, tone, and the house no-em-dash rule.",
    content:
      "# Brand & Voice Guidelines\n\nColors: interior forest teal (#0f5c4a) and warm amber (#e07a2f) on warm paper.\n\nVoice: clear, practical, encouraging. Sentence case. Active voice. Never use em dashes. Never claim outcomes you cannot evidence.\n\nThese rules are enforced across generated content in the Marketing Studio, Social Studio, and Grants proposals. See [[About CIBA]].",
  },
];
