import { generateObject, generateText } from "ai";
import { AI_ENABLED, model, reasoningModel } from "@/lib/ai";
import { stripEmDashes } from "@/lib/os/social/sanitize";
import { fitSchema, grantScanSchema, questionsSchema, type ScannedGrant } from "./schemas";
import { proposalSystemPrompt, proposalUserPrompt, questionsSystemPrompt } from "./prompts";
import { cibaContextBlock, cibaRefsForQuery } from "./context";
import type { Discovery, FitAnalysis, Funder, IntakeQuestion } from "./types";

/* -------------------- Scanner (locator) -------------------- */

// Curated demo opportunities per funder — realistic BC accelerator programs, so
// the locator is fully usable with no API key.
const SCAN_FIXTURES: Record<string, ScannedGrant[]> = {
  pacifican: [
    { title: "Regional Economic Growth through Innovation (REGI) — Business Scale-up", amount: "Up to $500,000", deadline: "Rolling", summary: "Repayable and non-repayable contributions to help SMEs and ecosystems scale.", eligibility: "Incorporated SMEs and not-for-profit ecosystem partners in BC." },
    { title: "Jobs and Growth Fund — Inclusive Recovery", amount: "$100,000–$1M", deadline: "2026-09-15", summary: "Supports business growth, green transition, and inclusive economic recovery.", eligibility: "Not-for-profits and SMEs delivering regional benefit." },
  ],
  "innovate-bc": [
    { title: "Integrated Marketplace / Ecosystem Partnership Program", amount: "Up to $300,000", deadline: "2026-08-30", summary: "Funds ecosystem partners running acceleration and adoption programs.", eligibility: "BC-based not-for-profit innovation organizations." },
    { title: "Innovator Skills Initiative", amount: "$10,000 per placement", deadline: "Rolling", summary: "Wage subsidy to place youth and underrepresented talent in first tech jobs.", eligibility: "BC employers hiring eligible talent." },
  ],
  "etsi-bc": [
    { title: "Economic Diversification & Capacity Building Grant", amount: "Up to $75,000", deadline: "2026-10-01", summary: "Supports projects that diversify the Southern Interior economy and build local capacity.", eligibility: "Organizations operating in the ETSI-BC region." },
  ],
  "discovery-foundation": [
    { title: "Tech Champions — AI Skills & Adoption", amount: "$25,000–$150,000", deadline: "2026-09-30", summary: "Funds programs that build AI/tech skills and support SME adoption.", eligibility: "BC not-for-profits delivering technology education." },
  ],
  wecbc: [
    { title: "Women's Business Program Delivery Grant", amount: "Up to $50,000", deadline: "Rolling", summary: "Supports training and mentorship programs for women-led businesses.", eligibility: "Organizations serving women entrepreneurs in BC." },
  ],
};

export interface ScanResult {
  grants: ScannedGrant[];
}

export async function scanFunder(funder: Funder): Promise<ScanResult> {
  if (!AI_ENABLED) {
    return { grants: SCAN_FIXTURES[funder.id] ?? [] };
  }
  try {
    const { object } = await generateObject({
      model,
      schema: grantScanSchema,
      system:
        "You are a diligent grants researcher for a BC business accelerator. List current or upcoming funding programs from the named funder that a nonprofit accelerator could apply to. Only include real, plausible programs. Never fabricate deadlines or amounts you are unsure of (omit the field instead).",
      prompt: `Funder: ${funder.name} (${funder.url}). Focus: ${funder.focus}\nApplicant: CIBA, a nonprofit business accelerator at TRU in Kamloops, BC.\nList the programs.`,
    });
    return { grants: object.grants };
  } catch {
    return { grants: SCAN_FIXTURES[funder.id] ?? [] };
  }
}

/* -------------------- Fit analysis -------------------- */

export async function analyzeFit(discovery: Discovery): Promise<FitAnalysis> {
  const query = `${discovery.title} ${discovery.summary} ${discovery.eligibility ?? ""}`;
  const relatedRefs = cibaRefsForQuery(query, 4).map((r) => ({ id: r.id, label: r.label, href: r.href }));
  const analyzedAt = new Date().toISOString();

  if (!AI_ENABLED) {
    const hits = relatedRefs.length;
    const score = Math.min(92, 45 + hits * 11);
    return {
      score,
      rationale: `This ${discovery.orgName} program aligns with CIBA's regional accelerator mandate and its programs at TRU. ${hits} CIBA initiatives map to its focus, giving a solid but not perfect fit.`,
      strengths: ["Direct match to CIBA's venture acceleration and regional delivery mandate", "Established TRU partnership and reporting track record", "Existing programs that map to the funder's priorities"],
      gaps: ["Confirm eligibility and application deadline before committing", "Quantify baseline metrics for the KPI section"],
      relatedRefs,
      analyzedAt,
    };
  }

  try {
    const { object } = await generateObject({
      model: reasoningModel,
      schema: fitSchema,
      system:
        "You assess how well a grant fits CIBA. Base your analysis ONLY on the provided CIBA context and the grant details. Score 0 to 100. Be honest about gaps. Never use em dashes.",
      prompt: `CIBA CONTEXT:\n${cibaContextBlock(query)}\n\nGRANT:\n${discovery.title} (funder ${discovery.orgName}). ${discovery.summary}\nEligibility: ${discovery.eligibility ?? "n/a"}\nAmount: ${discovery.amount ?? "n/a"}\n\nAnalyze the fit.`,
    });
    return {
      score: Math.max(0, Math.min(100, Math.round(object.score))),
      rationale: stripEmDashes(object.rationale),
      strengths: object.strengths.map(stripEmDashes),
      gaps: object.gaps.map(stripEmDashes),
      relatedRefs,
      analyzedAt,
    };
  } catch {
    return { score: 60, rationale: "Fit analysis is unavailable right now. Based on the funder's focus this looks broadly aligned with CIBA's mandate.", strengths: ["Aligned with CIBA's regional mandate"], gaps: ["Re-run analysis for detail"], relatedRefs, analyzedAt };
  }
}

/* -------------------- Intake questions -------------------- */

function mockQuestions(): IntakeQuestion[] {
  return [
    { id: "program-name", question: "What is the name of the program or project this grant would fund?", inputType: "text" },
    { id: "target-numbers", question: "How many businesses or founders will it serve, and over what period?", hint: "e.g. 40 ventures over 12 months", inputType: "text" },
    { id: "budget", question: "What is the total budget, and the amount requested from this funder?", hint: "Include major line items if you can.", inputType: "textarea" },
    { id: "outcomes", question: "What measurable outcomes will you commit to (jobs, revenue, completion rates)?", inputType: "textarea" },
    { id: "partners", question: "Which partners are involved and what do they contribute?", inputType: "textarea" },
    { id: "timeline", question: "What is the timeline, including major milestones?", inputType: "textarea" },
  ];
}

export async function generateQuestions(discovery: Discovery): Promise<IntakeQuestion[]> {
  if (!AI_ENABLED) return mockQuestions();
  try {
    const { object } = await generateObject({
      model,
      schema: questionsSchema,
      system: questionsSystemPrompt(),
      prompt: `Grant: ${discovery.title} (funder ${discovery.orgName}). ${discovery.summary}\nEligibility: ${discovery.eligibility ?? "n/a"}\nWrite the intake questions.`,
    });
    return object.questions.slice(0, 6);
  } catch {
    return mockQuestions();
  }
}

/* -------------------- Proposal generation -------------------- */

function mockProposal(discovery: Discovery, answers: Record<string, string>): string {
  const a = (k: string, fallback: string) => (answers[k]?.trim() ? answers[k] : fallback);
  const program = a("program-name", `CIBA program for ${discovery.orgName}`);
  const target = a("target-numbers", "40 ventures over 12 months");
  const budget = a("budget", "Total budget $250,000; requested $150,000");
  const outcomes = a("outcomes", "80 jobs supported, $2M in enabled revenue, 85% program completion");
  const partners = a("partners", "Thompson Rivers University (talent and space), regional economic development offices");
  const timeline = a("timeline", "Months 1-2 recruit; 3-9 deliver; 10-12 measure and report");
  return [
    `# ${program}: A Proposal to ${discovery.orgName}`,
    ``,
    `## Executive Summary`,
    `CIBA (Central Interior Business Accelerator) requests support from ${discovery.orgName} for ${program}, a program serving ${target} across the Thompson, Nicola, and Cariboo regions from its base at Thompson Rivers University. ${discovery.summary}`,
    ``,
    `## Problem Statement`,
    `Founders in BC's Southern Interior face limited access to acceleration, mentorship, and applied technology support compared to metro centres. Without regional programming, promising ventures stall or relocate, and local economic benefit is lost.`,
    ``,
    `## Beneficiaries`,
    `The program directly serves ${target}, prioritizing underrepresented founders including women, Indigenous, and newcomer entrepreneurs across the region.`,
    ``,
    `## Program Description`,
    `${program} combines cohort-based acceleration, one-to-one mentorship matching, and applied-AI adoption clinics delivered with TRU talent. Participants progress through structured milestones with hands-on support to ship real outcomes.`,
    ``,
    `## Logic Model`,
    `Inputs (funding, mentors, TRU partnership) lead to activities (recruitment, cohort delivery, clinics), which produce outputs (${target}), leading to outcomes (${outcomes}) and long-term regional economic diversification.`,
    ``,
    `## Key Performance Indicators`,
    ``,
    `| Indicator | Baseline | Target | Measurement Method |`,
    `| --- | --- | --- | --- |`,
    `| Ventures served | 0 | ${target.replace(/[^0-9]/g, "") || "40"} | Program CRM |`,
    `| Jobs supported | Current | +80 | Founder reporting |`,
    `| Program completion | n/a | 85% | Attendance records |`,
    `| Enabled revenue | Baseline | +$2M | Annual founder survey |`,
    ``,
    `## Risk Assessment`,
    `Key risks include recruitment shortfalls (mitigated by regional partner outreach) and mentor capacity (mitigated by the CIBA mentor network). A human reviews all milestones.`,
    ``,
    `## Budget`,
    `${budget}. Funds are allocated across program delivery, mentorship, facilitation, and measurement, with in-kind contributions from ${partners}.`,
    ``,
    `## Governance`,
    `CIBA is a registered nonprofit governed by a volunteer board and led by Executive Director Sachin Singh. Financial controls and funder reporting are managed through the organization's finance function.`,
    ``,
    `## Impact Narrative`,
    `By investing in ${program}, ${discovery.orgName} strengthens the regional innovation ecosystem, creates durable local jobs, and advances inclusive economic development in the Thompson-Nicola-Cariboo region.`,
    ``,
    `## Sustainability`,
    `${timeline}. Beyond the grant term, the program continues through diversified funding, partner co-investment, and earned program revenue, ensuring lasting regional benefit.`,
    ``,
  ].join("\n");
}

export async function generateProposalMarkdown(discovery: Discovery, answers: Record<string, string>): Promise<string> {
  let md: string;
  if (!AI_ENABLED) {
    md = mockProposal(discovery, answers);
  } else {
    try {
      const query = `${discovery.title} ${discovery.summary}`;
      const { text } = await generateText({
        model: reasoningModel,
        system: proposalSystemPrompt(),
        prompt: proposalUserPrompt({ discovery, answers, context: cibaContextBlock(query) }),
      });
      md = text;
    } catch {
      md = mockProposal(discovery, answers);
    }
  }
  return stripEmDashes(md);
}

/* -------------------- Rewrite -------------------- */

export async function rewriteText(scope: "selection" | "document", text: string, instruction: string): Promise<string> {
  if (!AI_ENABLED || !text.trim()) {
    // Heuristic demo rewrites.
    if (/shorten|concise|tighten/i.test(instruction)) return stripEmDashes(text.split(/(?<=[.!?])\s+/).slice(0, Math.max(1, Math.ceil(text.split(/(?<=[.!?])\s+/).length / 2))).join(" "));
    if (/formal|professional/i.test(instruction)) return stripEmDashes(text.replace(/\bwe'?re\b/gi, "we are").replace(/\bdon'?t\b/gi, "do not").replace(/\bcan'?t\b/gi, "cannot"));
    if (/expand|elaborate|longer/i.test(instruction)) return stripEmDashes(text + " This provides measurable regional benefit and aligns with the funder's priorities.");
    return stripEmDashes(text);
  }
  try {
    const { text: out } = await generateText({
      model,
      system:
        scope === "selection"
          ? "Rewrite the passage per the instruction. Return only the rewritten passage, no preamble. Never use em dashes."
          : "Rewrite the whole document per the instruction, preserving Markdown structure and section order. Never use em dashes.",
      prompt: `Instruction: ${instruction}\n\nText:\n${text}`,
    });
    return stripEmDashes(out);
  } catch {
    return stripEmDashes(text);
  }
}
