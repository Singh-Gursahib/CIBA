// Deterministic heuristic engine used when no ANTHROPIC_API_KEY is set ("demo
// mode"). It keeps the whole app functional & demoable offline. When a key is
// present the API routes use real Claude reasoning instead.

import { MENTORS } from "./mentors";
import type {
  MatchInput,
  MatchResult,
  ReadinessInput,
  ReadinessResult,
  TriageInput,
  TriageResult,
} from "./schemas";

const has = (text: string, words: string[]) =>
  words.some((w) => text.toLowerCase().includes(w));

export function demoTriage(input: TriageInput): TriageResult {
  const blob = `${input.pitch} ${input.traction} ${input.ask}`.toLowerCase();
  const hasRevenue = has(blob, ["revenue", "customers", "paying", "arr", "mrr", "sales", "clients"]);
  const hasUsers = has(blob, ["users", "pilot", "beta", "waitlist", "signups", "testing"]);
  const isEstablished = has(blob, ["years", "established", "employees", "operations", "existing business"]);
  const isAI = has(blob, ["ai", "machine learning", "ml", "model", "automation", "llm"]);

  let stage: TriageResult["stage"] = "idea";
  let readiness = 35;
  if (isEstablished) {
    stage = "operating";
    readiness = 70;
  } else if (hasRevenue) {
    stage = "growth";
    readiness = 80;
  } else if (hasUsers) {
    stage = "validation";
    readiness = 60;
  }

  const serviceAreas =
    stage === "operating"
      ? ["tech-integration", "growth-strategy", "business-planning"]
      : stage === "growth"
        ? ["growth-strategy", "business-planning", "ip-strategy"]
        : stage === "validation"
          ? ["market-validation", "tech-development", "growth-strategy"]
          : ["market-validation", "business-planning"];

  const recommendedProgram =
    isAI && (stage === "validation" || stage === "growth")
      ? "ai-commercialization-sprint"
      : stage === "operating"
        ? "ai-skills-accelerator"
        : stage === "idea"
          ? "advisory-workshops"
          : "one-to-one-mentorship";

  return {
    stage,
    readiness,
    summary: `${input.company} — ${input.pitch.slice(0, 160)}${input.pitch.length > 160 ? "…" : ""}`,
    serviceAreas,
    recommendedProgram,
    strengths: [
      hasRevenue ? "Already generating revenue / paying customers" : "Clear articulation of the problem",
      isAI ? "Tech/AI-enabled — fits CIBA's commercialization focus" : "Regionally rooted opportunity",
    ],
    gaps: [
      !hasRevenue && !hasUsers ? "No validation signal yet — needs customer discovery" : "Scaling repeatable sales",
      "Financial model & funding path unclear from intake",
    ],
    staffBrief: [
      `• ${input.name} @ ${input.company}${input.location ? ` (${input.location})` : ""}`,
      `• Stage read: ${stage} · readiness ${readiness}/100`,
      `• Lead with: ${serviceAreas[0].replace(/-/g, " ")}`,
      `• Ask on file: ${input.ask || "not specified — clarify on the call"}`,
      `• Probe: ${!hasRevenue ? "evidence of demand & willingness to pay" : "sales repeatability & margins"}`,
    ].join("\n"),
    nextSteps: [
      stage === "idea" ? "Run 5 customer discovery interviews before building more" : "Bring current metrics to the intake call",
      "Book a 1:1 with a matched CIBA advisor",
    ],
  };
}

export function demoMatch(input: MatchInput): MatchResult {
  const blob = `${input.founderSummary} ${input.industry} ${input.need}`.toLowerCase();
  const scored = MENTORS.map((m) => {
    let score = 40;
    if (m.stages.includes(input.stage)) score += 20;
    if (m.industries.some((i) => blob.includes(i.toLowerCase()))) score += 18;
    if (m.expertise.some((e) => blob.includes(e.toLowerCase().split(" ")[0]))) score += 12;
    if (has(blob, ["ai", "ml", "model"]) && m.expertise.some((e) => e.toLowerCase().includes("ai"))) score += 15;
    if (has(blob, ["fund", "raise", "invest", "financ"]) && m.expertise.some((e) => /fund|financ|invest/i.test(e))) score += 12;
    if (has(blob, ["indigenous", "first nation"]) && m.expertise.some((e) => /indigenous/i.test(e))) score += 20;
    if (m.capacity === "limited") score -= 4;
    if (m.capacity === "full") score -= 18;
    return { m, score: Math.min(99, score) };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    matches: scored.map(({ m, score }) => ({
      mentorId: m.id,
      score,
      why: `${m.name} brings ${m.expertise.slice(0, 2).join(" & ").toLowerCase()} in ${m.industries[0]}, and is strong with ${input.stage}-stage founders.`,
      watchout:
        m.capacity === "full"
          ? "Currently at full mentoring capacity — may need a waitlist."
          : m.capacity === "limited"
            ? "Limited availability — confirm bandwidth before committing."
            : "Open capacity; confirm industry overlap on the intro call.",
    })),
  };
}

export function demoReadiness(input: ReadinessInput): ReadinessResult {
  const vals = Object.values(input.answers).join(" ").toLowerCase();
  const dataDigital = has(vals, ["digital", "software", "crm", "database", "spreadsheet", "yes"]);
  const repetitive = has(vals, ["repetitive", "manual", "lots", "daily", "many", "hours"]);
  const usesTools = has(vals, ["already", "use ai", "chatgpt", "tools", "automation"]);

  let score = 45;
  if (dataDigital) score += 20;
  if (repetitive) score += 20;
  if (usesTools) score += 10;
  score = Math.min(95, score);

  const band: ReadinessResult["band"] = score >= 75 ? "Accelerating" : score >= 55 ? "Ready" : "Exploring";

  return {
    score,
    band,
    headline:
      band === "Accelerating"
        ? `${input.business} has the data and repeatable workflows to ship real AI wins now.`
        : band === "Ready"
          ? `${input.business} has clear, practical AI opportunities worth starting on.`
          : `${input.business} can unlock AI with a few foundational steps first.`,
    opportunities: [
      {
        title: "Automate customer & email responses",
        problem: "Staff spend hours each week answering the same customer questions and emails.",
        solution: "An AI assistant drafts replies from your past responses and FAQs; a human approves & sends.",
        impact: "high",
        effort: "low",
      },
      {
        title: "Turn documents & notes into structured data",
        problem: "Invoices, forms, and notes get re-typed by hand into spreadsheets or your system.",
        solution: "AI reads documents and extracts the fields you need, ready to review and import.",
        impact: "medium",
        effort: "medium",
      },
      {
        title: "Summarize & surface what matters",
        problem: "Reports, reviews, and meeting notes pile up and never get read.",
        solution: "AI summarizes them into weekly digests and flags trends, risks, and opportunities.",
        impact: "medium",
        effort: "low",
      },
    ],
    firstProject:
      "Start with automating repetitive customer responses — it's low effort, high impact, and pays back within weeks while building your team's confidence with AI.",
    cibaHook:
      "CIBA's AI Skills Accelerator would pair you with mentors and TRU talent to ship this first project hands-on, not just talk about it.",
  };
}
