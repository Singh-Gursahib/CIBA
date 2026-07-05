// CIBA OS — entity model.
// Everything in the OS hangs off these types: partners, collaborations
// (projects), team members with scoped access, integrations, funding,
// social posts, documents, ventures, and activity events.

export type Role = "executive" | "programs" | "funding" | "marketing" | "outreach";

export type Member = {
  id: string;
  name: string;
  title: string;
  role: Role;
  email: string;
  avatarColor: string;
  /** Project ids this member can access. "*" = all projects (admin). */
  projectAccess: string[] | "*";
  /** Integration ids this member can operate. "*" = all. */
  integrationAccess: string[] | "*";
};

export type Partner = {
  id: string;
  name: string;
  kind: "university" | "funder" | "accelerator" | "government" | "corporate" | "community" | "indigenous";
  region: string;
  about: string;
  url?: string;
};

export type Project = {
  id: string;
  name: string;
  status: "active" | "planning" | "wrapped";
  summary: string;
  partnerIds: string[];
  leadMemberId: string;
  memberIds: string[];
  integrationIds: string[];
  /** Real program this collaboration reflects. */
  programTag: string;
  start: string; // ISO date
  end?: string;
};

export type IntegrationKind = "financing" | "social" | "data" | "crm" | "llm";

export type Integration = {
  id: string;
  name: string;
  kind: IntegrationKind;
  provider: string; // e.g. "QuickBooks", "Buffer", "Google Drive"
  status: "connected" | "syncing" | "attention";
  lastSync: string;
  description: string;
};

export type FundingRecord = {
  id: string;
  projectId: string;
  source: string; // partner name
  kind: "grant" | "sponsorship" | "program-delivery" | "co-investment";
  amountCAD: number;
  status: "received" | "committed" | "applied" | "reporting-due";
  reportDeadline?: string; // ISO date
  notes: string;
};

export type SocialPost = {
  id: string;
  projectId: string;
  channel: "LinkedIn" | "Instagram" | "Eventbrite" | "Newsletter";
  status: "published" | "scheduled" | "draft";
  date: string;
  content: string;
  engagement?: { views: number; clicks: number };
};

export type Doc = {
  id: string;
  projectId: string;
  name: string;
  type: "agreement" | "report" | "deck" | "budget" | "notes" | "application";
  updated: string;
  owner: string; // member id
  sensitive: boolean; // sensitive docs visible only to project lead + executives
};

export type Venture = {
  id: string;
  name: string;
  founder: string;
  sector: string;
  projectIds: string[]; // which CIBA programs it's in
  stage: "idea" | "validation" | "growth" | "operating";
  metrics: { jobs: number; revenueCAD: number; raisedCAD: number };
};

export type ActivityEvent = {
  id: string;
  when: string;
  memberId: string;
  projectId?: string;
  action: string;
};
