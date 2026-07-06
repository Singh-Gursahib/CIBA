import type { Funder } from "./types";

// CIBA's real funder registry — the sources the locator scans. These mirror the
// programs already referenced in the finance seed (PacifiCan, ETSI-BC, etc.).
export const FUNDERS: Funder[] = [
  {
    id: "pacifican",
    name: "PacifiCan",
    url: "https://www.canada.ca/en/pacific-economic-development.html",
    focus: "Regional economic development in BC — business scale-up, regional innovation ecosystems, inclusive entrepreneurship.",
  },
  {
    id: "innovate-bc",
    name: "Innovate BC",
    url: "https://www.innovatebc.ca/",
    focus: "BC technology and innovation — venture acceleration, youth/first-job programs, ecosystem partnerships.",
  },
  {
    id: "etsi-bc",
    name: "ETSI-BC",
    url: "https://etsi.ca/",
    focus: "Economic Trust of the Southern Interior — economic diversification and capacity building across the Southern Interior.",
  },
  {
    id: "discovery-foundation",
    name: "Discovery Foundation",
    url: "https://www.discoveryfoundation.ca/",
    focus: "Technology skills and AI education programs, adoption clinics, and talent development in BC.",
  },
  {
    id: "wecbc",
    name: "Women's Enterprise Centre",
    url: "https://womensenterprise.ca/",
    focus: "Women-led business growth — training, mentorship, and program delivery funding.",
  },
];

export const getFunder = (id: string): Funder | undefined => FUNDERS.find((f) => f.id === id);
