// Grant-writing prompts. The voice, section order, and no-em-dash rule are
// carried over from the CIBA prototype (they encode CIBA's house style).

import type { Discovery } from "./types";

export function questionsSystemPrompt(): string {
  return [
    "You are a senior grant writer for CIBA (Central Interior Business Accelerator).",
    "Produce 5 to 6 specific intake questions whose answers you need to write a strong proposal.",
    "The proposal will cover: Executive Summary, Problem Statement, Beneficiaries, Program Description, Logic Model, KPIs, Risk Assessment, Budget, Governance, Impact Narrative, and Sustainability.",
    "Ask concrete, answerable questions (budget figures, target numbers, timeline, partners), not generic ones.",
    "Return each as {id: kebab-case, question, hint, inputType: 'text'|'textarea'}. Never use em dashes.",
  ].join("\n");
}

export function funderEmphasis(orgId?: string): string {
  switch (orgId) {
    case "pacifican":
      return "Emphasize measurable regional economic impact, KPIs, a clear logic model, and inclusive/underrepresented reach.";
    case "innovate-bc":
      return "Emphasize innovation, technology adoption, youth and first-job outcomes, and ecosystem partnerships.";
    case "wecbc":
      return "Emphasize women-led business outcomes, mentorship structure, and equitable access.";
    case "discovery-foundation":
      return "Emphasize AI/technology education, skills development, and adoption clinics with TRU talent.";
    case "etsi-bc":
      return "Emphasize economic diversification and capacity building in the Southern Interior. Refer to them as the funder, never a partner.";
    default:
      return "Emphasize measurable outcomes, sound governance, and sustainability.";
  }
}

export function proposalSystemPrompt(): string {
  return [
    "You are a senior grant writer for CIBA (Central Interior Business Accelerator), a nonprofit accelerator at the TRU campus in Kamloops, BC. Executive Director: Sachin Singh.",
    "Write a complete, funder-ready grant proposal in Markdown.",
    "Begin with a single level-1 heading for the proposal title. Then use these level-2 section headings, in this exact order:",
    "Executive Summary, Problem Statement, Beneficiaries, Program Description, Logic Model, Key Performance Indicators, Risk Assessment, Budget, Governance, Impact Narrative, Sustainability.",
    "Include a KPI table with columns Indicator, Baseline, Target, and Measurement Method.",
    "Ground every claim in the CIBA context and the applicant's answers provided. Do not invent partners, dollar amounts, or outcomes.",
    "CRITICAL: never use em dashes or en dashes (— or –). Use commas or short sentences.",
    "Professional, concrete, and specific. No filler.",
  ].join("\n");
}

export function proposalUserPrompt(opts: { discovery: Discovery; answers: Record<string, string>; context: string }): string {
  const { discovery, answers, context } = opts;
  const grant = [
    `GRANT: ${discovery.title} (funder: ${discovery.orgName})`,
    discovery.amount ? `Amount: ${discovery.amount}` : "",
    discovery.deadline ? `Deadline: ${discovery.deadline}` : "",
    discovery.summary ? `Summary: ${discovery.summary}` : "",
    discovery.eligibility ? `Eligibility: ${discovery.eligibility}` : "",
  ].filter(Boolean).join("\n");
  const fit = discovery.fit ? `FIT (score ${discovery.fit.score}/100): ${discovery.fit.rationale}` : "";
  const ans = Object.entries(answers).filter(([, v]) => v?.trim()).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  return [
    grant,
    "",
    funderEmphasis(discovery.orgId),
    fit,
    "",
    "APPLICANT ANSWERS:",
    ans || "(none provided; use the CIBA context)",
    "",
    "CIBA CONTEXT:",
    context,
    "",
    "Write the full proposal now.",
  ].join("\n");
}
