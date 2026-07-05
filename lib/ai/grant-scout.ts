import "server-only";
import { generate, generateJson } from "./gemini";
import { fullToday } from "@/lib/utils/dates";
import type { FundingOrg } from "@/types/grants";

export interface ScannedGrant {
  title: string;
  url?: string;
  deadline?: string;
  amount?: string;
  summary: string;
  eligibility?: string;
}

export interface OrgScanResult {
  grants: ScannedGrant[];
  queries: string[];
}

const GRANT_SCHEMA = {
  type: "object",
  properties: {
    grants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          deadline: { type: "string" },
          amount: { type: "string" },
          summary: { type: "string" },
          eligibility: { type: "string" },
        },
        required: ["title", "summary"],
      },
    },
  },
  required: ["grants"],
};

/**
 * Scan one funding organization for currently open grants using Gemini with
 * Google Search grounding, then coerce the answer to strict JSON in a second
 * call (separating search from structuring keeps both reliable and avoids
 * repeating billable searches on JSON parse failures).
 */
export async function scanOrg(org: FundingOrg): Promise<OrgScanResult> {
  const today = fullToday();
  const searchPrompt = [
    `Today is ${today}.`,
    `Search the web for currently open or recently announced grant and funding programs from ${org.name} (${org.url}).`,
    `Focus area: ${org.focus}.`,
    "The applicant is CIBA (Central Interior Business Accelerator), a regional innovation hub serving the Central Interior of British Columbia that accelerates SMEs, entrepreneurs, and student founders, with a focus on AI adoption and measurable regional impact.",
    "Only include programs that appear to be open now or opening soon. For each program, note the title, application URL, deadline, funding amount, a one sentence summary, and eligibility.",
    "If you cannot find any clearly open programs, say so plainly.",
  ].join("\n");

  const { content } = await generate({
    system:
      "You are a diligent grants researcher. Use web search to find real, current funding opportunities. Never fabricate programs, deadlines, or amounts.",
    contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
    googleSearch: true,
    temperature: 0.3,
  });

  const findings = (content?.parts ?? []).map((p) => p.text).filter(Boolean).join("").trim();
  if (!findings) return { grants: [], queries: [] };

  const structured = await generateJson<{ grants: ScannedGrant[] }>({
    system:
      "Extract structured grant opportunities from the research notes. Output valid JSON matching the schema. Only include programs actually described in the notes. Do not invent fields.",
    contents: [
      {
        role: "user",
        parts: [{ text: `Research notes about ${org.name}:\n\n${findings}\n\nExtract the grant opportunities.` }],
      },
    ],
    responseSchema: GRANT_SCHEMA,
    temperature: 0,
  });

  return { grants: structured.grants ?? [], queries: [`${org.name} open grants ${new Date().getFullYear()}`] };
}
