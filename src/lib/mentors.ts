// Representative CIBA mentor network. In production this would come from a CRM /
// database; here it's realistic seed data reflecting the kinds of advisors CIBA
// pairs with founders across the Thompson, Nicola & Cariboo regions.

export type Mentor = {
  id: string;
  name: string;
  title: string;
  location: string;
  expertise: string[];
  industries: string[];
  stages: string[]; // stage ids the mentor is strongest with
  bio: string;
  capacity: "open" | "limited" | "full";
};

export const MENTORS: Mentor[] = [
  {
    id: "m-priya",
    name: "Priya Nair",
    title: "Ex-VP Product, B2B SaaS",
    location: "Kamloops, BC",
    expertise: ["Product-market fit", "SaaS go-to-market", "Pricing", "Discovery interviews"],
    industries: ["SaaS", "B2B software", "Fintech"],
    stages: ["validation", "growth"],
    bio: "Scaled two SaaS products from zero to $10M ARR. Strong on early validation and pricing.",
    capacity: "open",
  },
  {
    id: "m-dave",
    name: "Dave Whitecloud",
    title: "Indigenous Business Advisor",
    location: "Tk'emlúps te Secwépemc",
    expertise: ["Indigenous business development", "Grants & funding", "Community partnerships", "Governance"],
    industries: ["Construction", "Retail", "Food", "Tourism"],
    stages: ["idea", "validation", "operating"],
    bio: "Advises First Nations–led ventures on funding, partnerships, and sustainable growth in the region.",
    capacity: "open",
  },
  {
    id: "m-sarah",
    name: "Sarah Lindqvist",
    title: "Fractional CFO",
    location: "Kelowna, BC",
    expertise: ["Financial modeling", "Fundraising", "Unit economics", "Investor readiness"],
    industries: ["Manufacturing", "CPG", "SaaS", "Agriculture"],
    stages: ["growth", "operating"],
    bio: "Helps founders build board-ready financials and raise their first institutional round.",
    capacity: "limited",
  },
  {
    id: "m-marcus",
    name: "Marcus Chen",
    title: "AI/ML Engineering Lead",
    location: "Vancouver, BC (remote)",
    expertise: ["AI adoption", "MVP architecture", "Data strategy", "Technical hiring"],
    industries: ["SaaS", "Healthtech", "Logistics"],
    stages: ["validation", "growth", "operating"],
    bio: "Ships production AI systems. Great for teams turning an AI idea into a real, shippable MVP.",
    capacity: "open",
  },
  {
    id: "m-elena",
    name: "Elena Ruiz",
    title: "Growth & Brand Marketer",
    location: "Kamloops, BC",
    expertise: ["Go-to-market", "Brand", "Content & SEO", "Community building"],
    industries: ["CPG", "Retail", "Tourism", "Food"],
    stages: ["validation", "growth"],
    bio: "Built demand engines for consumer brands. Strong on positioning and early traction.",
    capacity: "limited",
  },
  {
    id: "m-tom",
    name: "Tom Beaumont",
    title: "Operations & Manufacturing Advisor",
    location: "Merritt, BC",
    expertise: ["Operations", "Supply chain", "Lean processes", "Tech integration"],
    industries: ["Manufacturing", "Agriculture", "Forestry", "Construction"],
    stages: ["operating", "growth"],
    bio: "35 years modernizing operations for interior BC manufacturers and resource businesses.",
    capacity: "open",
  },
  {
    id: "m-aisha",
    name: "Aisha Okonkwo",
    title: "Serial Founder & Angel",
    location: "Kamloops, BC",
    expertise: ["Founder coaching", "Fundraising", "Board building", "Storytelling"],
    industries: ["Healthtech", "SaaS", "Marketplace"],
    stages: ["idea", "validation", "growth"],
    bio: "Two exits. Now angel-invests and coaches first-time founders through the hard early months.",
    capacity: "full",
  },
  {
    id: "m-grant",
    name: "Grant Fielding",
    title: "IP & Commercialization Lawyer",
    location: "Kamloops, BC",
    expertise: ["IP strategy", "Patents", "Licensing", "Commercialization"],
    industries: ["Deeptech", "Manufacturing", "Agriculture", "Healthtech"],
    stages: ["validation", "growth"],
    bio: "Helps deeptech and hardware ventures protect and license what makes them defensible.",
    capacity: "open",
  },
];
