import "server-only";
import { generateJson } from "./gemini";
import { stripEmDashes } from "./sanitize";
import { searchDocs } from "@/lib/content/search";
import { getDoc } from "@/lib/content/loader";
import { nowIso } from "@/lib/utils/dates";
import { isMockText } from "@/lib/config";
import type { Discovery, FitAnalysis } from "@/types/grants";

const FIT_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer" },
    rationale: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
  },
  required: ["score", "rationale", "strengths", "gaps"],
};

/**
 * Analyze whether CIBA is a strong candidate for a grant. Uses the knowledge
 * base as CIBA's memory: keyword search finds relevant past work, then the
 * top documents (bounded to 3) are read and passed to the model for scoring.
 */
export async function analyzeFit(discovery: Discovery): Promise<FitAnalysis> {
  const query = `${discovery.title} ${discovery.summary} ${discovery.eligibility ?? ""}`;
  const hits = await searchDocs(query, 4);
  const topDocs = (await Promise.all(hits.slice(0, 3).map((h) => getDoc(h.slug)))).filter(
    (d): d is NonNullable<typeof d> => !!d
  );
  const relatedDocs = topDocs.map((d) => ({ slug: d.slug, title: d.title }));

  if (isMockText()) {
    const score = Math.min(92, 45 + hits.length * 11);
    return {
      score,
      rationale: stripEmDashes(
        `CIBA is a promising candidate for ${discovery.title}. Its past work, including ${topDocs
          .map((d) => d.title)
          .join(" and ")}, aligns with the funder's focus on ${discovery.summary.toLowerCase()} This is a mock analysis; add a Gemini key and set MOCK_AI=false for a full assessment.`
      ),
      strengths: [
        "Demonstrated track record delivering funded programs in the BC Interior",
        "Established TRU partnership adds research and evaluation capacity",
        "Existing community relationships reduce delivery risk",
      ],
      gaps: [
        "Confirm the specific measurable outcomes the funder expects",
        "Clarify matching funds or in-kind contribution requirements",
      ],
      relatedDocs,
      analyzedAt: nowIso(),
    };
  }

  const context = topDocs
    .map((d) => `## ${d.title} (${d.type})\n${d.content.slice(0, 2000)}`)
    .join("\n\n");

  const result = await generateJson<Omit<FitAnalysis, "relatedDocs" | "analyzedAt">>({
    system: [
      "You assess whether CIBA (Central Interior Business Accelerator), a regional innovation hub serving the Central Interior of British Columbia with Thompson Rivers University as its strategic academic partner, is a strong candidate for a grant. CIBA's three pillars are Innovation, Collaboration, and Investment.",
      "Base your assessment ONLY on the provided organizational context and the grant details.",
      "Output valid JSON: score is 0 to 100, rationale is two to three sentences, strengths and gaps are short bullet strings.",
      "Do not use em dashes anywhere.",
    ].join("\n"),
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `GRANT\nTitle: ${discovery.title}\nFunder focus: ${discovery.summary}\nEligibility: ${
              discovery.eligibility ?? "not specified"
            }\nAmount: ${discovery.amount ?? "not specified"}\n\nCIBA ORGANIZATIONAL CONTEXT\n${context}\n\nAssess the fit.`,
          },
        ],
      },
    ],
    responseSchema: FIT_SCHEMA,
    temperature: 0.3,
  });

  return {
    score: Math.max(0, Math.min(100, result.score)),
    rationale: stripEmDashes(result.rationale),
    strengths: result.strengths.map(stripEmDashes),
    gaps: result.gaps.map(stripEmDashes),
    relatedDocs,
    analyzedAt: nowIso(),
  };
}
