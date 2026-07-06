// Grants domain model. Discoveries + proposals are mutable (persisted to .data);
// the funder registry is an immutable seed.

export type Funder = { id: string; name: string; url: string; focus: string };

export type DiscoveryStatus = "new" | "seen" | "shortlisted" | "dismissed" | "proposal_started";

export interface FitAnalysis {
  score: number; // 0–100
  rationale: string;
  strengths: string[];
  gaps: string[];
  /** CIBA programs/partners this grant aligns with. */
  relatedRefs: { id: string; label: string; href?: string }[];
  analyzedAt: string;
}

export interface Discovery {
  id: string; // sha1(orgId + normalized title)
  orgId: string;
  orgName: string;
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

export interface ScanOrgResult {
  orgId: string;
  orgName: string;
  found: number;
  isNew: number;
  error?: string;
}

export interface ScanLogEntry {
  id: string;
  startedAt: string;
  finishedAt: string;
  trigger: "manual" | "scheduled";
  memberId: string;
  orgsChecked: ScanOrgResult[];
  newDiscoveryIds: string[];
}

export interface IntakeQuestion {
  id: string;
  question: string;
  hint?: string;
  inputType: "text" | "textarea";
}

export type ProposalStatus = "draft" | "in_review" | "exported";

export interface ProposalMeta {
  slug: string;
  title: string;
  discoveryId?: string;
  orgName?: string;
  grantTitle?: string;
  status: ProposalStatus;
  createdBy: string; // member id
  createdAt: string;
  updatedAt: string;
}

export interface ProposalVersion {
  id: string; // timestamp-ish
  savedAt: string;
}
