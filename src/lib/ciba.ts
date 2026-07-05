// Static domain data about CIBA — its service areas and active programs.
// Sourced from acceleratebusiness.ca (Central Interior Business Accelerator).

export type ServiceArea = {
  id: string;
  name: string;
  blurb: string;
};

export const SERVICE_AREAS: ServiceArea[] = [
  {
    id: "market-validation",
    name: "Market Validation",
    blurb: "Prove there's a real, paying market before you build more.",
  },
  {
    id: "tech-development",
    name: "Technology Development",
    blurb: "Build the product — MVPs, prototypes, technical architecture.",
  },
  {
    id: "tech-integration",
    name: "Technology Integration",
    blurb: "Adopt tools & AI to modernize how an existing business runs.",
  },
  {
    id: "growth-strategy",
    name: "Growth Strategy",
    blurb: "Go-to-market, sales, and scaling an existing revenue base.",
  },
  {
    id: "business-planning",
    name: "Business Planning",
    blurb: "Model, plan, and fund the business — finance and operations.",
  },
  {
    id: "ip-strategy",
    name: "IP Strategy",
    blurb: "Protect and leverage intellectual property and defensibility.",
  },
];

export type Program = {
  id: string;
  name: string;
  fit: string;
  format: string;
  bestFor: string[]; // stage ids this program suits
};

export const PROGRAMS: Program[] = [
  {
    id: "ai-commercialization-sprint",
    name: "Interior AI Commercialization Sprint",
    fit: "B.C.-based, tech-enabled ventures with a working MVP ready to commercialize with AI.",
    format: "5 sessions over Feb–Apr, kicking off with a 2-day BaseCamp. Prototype with TRU faculty & students.",
    bestFor: ["validation", "growth"],
  },
  {
    id: "ai-skills-accelerator",
    name: "AI Skills Accelerator",
    fit: "Established SMBs and non-profits that want to adopt AI in day-to-day operations.",
    format: "Hands-on cohort helping teams identify and ship their first practical AI use cases.",
    bestFor: ["operating", "growth"],
  },
  {
    id: "one-to-one-mentorship",
    name: "1:1 Mentorship",
    fit: "Founders at any stage who need a matched mentor / advisor for accountability and expertise.",
    format: "Ongoing pairing with a seasoned mentor from CIBA's network (250+ entrepreneurs supported).",
    bestFor: ["idea", "validation", "growth", "operating"],
  },
  {
    id: "advisory-workshops",
    name: "Advisory & Workshops",
    fit: "Early founders still shaping the idea who benefit from foundational training first.",
    format: "Knowledge-building events and workshops in strategy, finance, validation, and marketing.",
    bestFor: ["idea"],
  },
];

export const STAGES = [
  { id: "idea", label: "Idea", desc: "Concept stage, not yet validated." },
  { id: "validation", label: "Validation", desc: "Testing the problem/solution with early users." },
  { id: "growth", label: "Growth / Scaleup", desc: "Has traction and revenue, scaling up." },
  { id: "operating", label: "Established Business", desc: "Mature business modernizing operations." },
] as const;

export type StageId = (typeof STAGES)[number]["id"];
