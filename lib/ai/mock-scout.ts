import "server-only";
import type { FundingOrg } from "@/types/grants";
import type { ScannedGrant } from "./grant-scout";

/**
 * Deterministic mock scan. Returns a small, plausible set of grants per org.
 * On the FIRST run the dedup layer treats them as new; on later runs they are
 * already seen, so the "new" count naturally drops. To reliably demonstrate a
 * fresh find, one org rotates in a dated opportunity keyed to the scan time.
 */
const FIXTURES: Record<string, ScannedGrant[]> = {
  pacifican: [
    {
      title: "Business Scale-up and Productivity Program",
      url: "https://www.canada.ca/en/pacific-economic-development.html",
      deadline: "Rolling intake",
      amount: "Up to $5,000,000 (interest-free, repayable)",
      summary: "Supports high-growth BC businesses to scale up, adopt technology, and expand into new markets.",
      eligibility: "Incorporated BC businesses and accelerators with a viable growth project.",
    },
  ],
  "etsi-bc": [
    {
      title: "Economic Diversification Grant 2026",
      url: "https://www.etsi-bc.ca/funding",
      deadline: "2026-08-15",
      amount: "Up to $250,000",
      summary: "Supports projects that diversify the economy of the BC Southern Interior and create durable local jobs.",
      eligibility: "Local governments, non-profits, and First Nations in the Southern Interior.",
    },
  ],
  "innovate-bc": [
    {
      title: "Ignite Program",
      url: "https://www.innovatebc.ca/ignite",
      deadline: "2026-09-30",
      amount: "Up to $300,000 over 3 years",
      summary: "Funds late-stage research and development in applied science and technology, with an emphasis on innovation and startup growth.",
      eligibility: "BC-based partnerships between industry and academic or non-profit organizations.",
    },
    {
      title: "Venture Acceleration Program Funding",
      url: "https://www.innovatebc.ca/vap",
      deadline: "Rolling intake",
      amount: "Program support (non-cash) plus mentor network",
      summary: "Structured mentorship and milestone support for early-stage technology ventures and the accelerators that host them.",
      eligibility: "Early-stage BC technology companies and regional accelerators.",
    },
  ],
  "discovery-foundation": [
    {
      title: "AI Capacity Building Grant",
      url: "https://www.discoveryfoundation.ca/programs",
      deadline: "2026-10-15",
      amount: "Up to $100,000",
      summary: "Supports AI education, community impact, and innovation capacity building across British Columbia.",
      eligibility: "Non-profits and educational organizations delivering AI and innovation programming.",
    },
  ],
  webc: [
    {
      title: "Women's Enterprise Growth Fund",
      url: "https://we-bc.ca/programs",
      deadline: "Rolling intake",
      amount: "Loans up to $150,000 plus advisory support",
      summary: "Financing, mentorship, and inclusive community support for women-led and women-owned businesses in BC.",
      eligibility: "Women entrepreneurs in British Columbia, including those served by regional accelerators.",
    },
  ],
};

export function mockScanOrg(org: FundingOrg): ScannedGrant[] {
  return FIXTURES[org.id] ?? [];
}
