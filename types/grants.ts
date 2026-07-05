export interface FundingOrg {
  id: string;
  name: string;
  url: string;
  focus: string;
}

export type DiscoveryStatus =
  | "new"
  | "seen"
  | "shortlisted"
  | "dismissed"
  | "proposal_started";

export interface FitAnalysis {
  score: number; // 0-100
  rationale: string;
  strengths: string[];
  gaps: string[];
  relatedDocs: { slug: string; title: string }[];
  analyzedAt: string;
}

export interface Discovery {
  id: string; // sha1(orgId + normalizedTitle) — dedup key
  orgId: string;
  title: string;
  url?: string;
  deadline?: string;
  amount?: string;
  summary: string;
  eligibility?: string;
  firstSeenAt: string;
  status: DiscoveryStatus;
  fit?: FitAnalysis;
}

export interface ScanLogEntry {
  id: string;
  startedAt: string;
  finishedAt: string;
  trigger: "manual" | "scheduled";
  orgsChecked: { orgId: string; orgName: string; found: number; isNew: number; error?: string }[];
  newDiscoveryIds: string[];
  searchQueries: string[];
}

export type QuestionInputType = "text" | "textarea";
export interface IntakeQuestion {
  id: string;
  question: string;
  hint?: string;
  inputType: QuestionInputType;
}

export type ProposalStatus = "draft" | "in_review" | "exported";
export interface ProposalMeta {
  slug: string;
  title: string;
  discoveryId?: string;
  orgName?: string;
  grantTitle?: string;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
}
