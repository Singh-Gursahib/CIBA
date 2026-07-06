// CIBA OS — data access layer with permission scoping.
// EVERYTHING (pages, APIs, and the LLM assistant) reads through these
// functions, so a member can only ever see data from projects they can access.

import {
  ACTIVITY,
  DOCS,
  FUNDING,
  INTEGRATIONS,
  MEMBERS,
  PARTNERS,
  PROJECTS,
  SOCIAL,
  VENTURES,
} from "./seed";
import { readStudioPosts } from "./social/read-sync";
import type { Doc, FundingRecord, Integration, Member, Partner, Project, SocialPost, Venture } from "./types";

export const getMember = (id: string): Member | undefined => MEMBERS.find((m) => m.id === id);
export const allMembers = (): Member[] => MEMBERS;
export const getPartner = (id: string): Partner | undefined => PARTNERS.find((p) => p.id === id);
export const allPartners = (): Partner[] => PARTNERS;
export const getIntegration = (id: string): Integration | undefined => INTEGRATIONS.find((i) => i.id === id);
export const allIntegrations = (): Integration[] => INTEGRATIONS;

// ---- permission core ----
export function canAccessProject(member: Member, projectId: string): boolean {
  return member.projectAccess === "*" || member.projectAccess.includes(projectId);
}

export function visibleProjects(member: Member): Project[] {
  return PROJECTS.filter((p) => canAccessProject(member, p.id));
}

export function getProject(member: Member, id: string): Project | undefined {
  const p = PROJECTS.find((x) => x.id === id);
  return p && canAccessProject(member, p.id) ? p : undefined;
}

/** Sensitive docs are only visible to executives and the project lead. */
export function visibleDocs(member: Member, projectId?: string): Doc[] {
  return DOCS.filter((d) => {
    if (projectId && d.projectId !== projectId) return false;
    if (!canAccessProject(member, d.projectId)) return false;
    if (!d.sensitive) return true;
    const project = PROJECTS.find((p) => p.id === d.projectId);
    return member.role === "executive" || project?.leadMemberId === member.id;
  });
}

export function visibleFunding(member: Member, projectId?: string): FundingRecord[] {
  return FUNDING.filter(
    (f) => (!projectId || f.projectId === projectId) && canAccessProject(member, f.projectId),
  );
}

export function visibleSocial(member: Member, projectId?: string): SocialPost[] {
  return SOCIAL.filter(
    (s) => (!projectId || s.projectId === projectId) && canAccessProject(member, s.projectId),
  );
}

export function visibleVentures(member: Member, projectId?: string): Venture[] {
  return VENTURES.filter((v) => {
    const ids = projectId ? v.projectIds.filter((id) => id === projectId) : v.projectIds;
    return ids.some((id) => canAccessProject(member, id));
  });
}

export function visibleActivity(member: Member) {
  return ACTIVITY.filter((a) => !a.projectId || canAccessProject(member, a.projectId));
}

export function visibleIntegrations(member: Member): Integration[] {
  if (member.integrationAccess === "*") return INTEGRATIONS;
  return INTEGRATIONS.filter((i) => (member.integrationAccess as string[]).includes(i.id));
}

// ---- rollups (impact reporting / deadline radar) ----
export function impactRollup(member: Member) {
  const ventures = visibleVentures(member);
  return {
    ventures: ventures.length,
    jobs: ventures.reduce((n, v) => n + v.metrics.jobs, 0),
    revenueCAD: ventures.reduce((n, v) => n + v.metrics.revenueCAD, 0),
    raisedCAD: ventures.reduce((n, v) => n + v.metrics.raisedCAD, 0),
  };
}

export function fundingRollup(member: Member) {
  const funding = visibleFunding(member);
  const sum = (status: FundingRecord["status"]) =>
    funding.filter((f) => f.status === status).reduce((n, f) => n + f.amountCAD, 0);
  return {
    receivedCAD: sum("received"),
    committedCAD: sum("committed"),
    appliedCAD: sum("applied"),
    records: funding.length,
  };
}

/** Upcoming report deadlines, soonest first — the "deadline radar". */
export function deadlineRadar(member: Member) {
  return visibleFunding(member)
    .filter((f) => f.reportDeadline)
    .sort((a, b) => (a.reportDeadline! < b.reportDeadline! ? -1 : 1));
}

// ---- brain map graph, scoped to the member ----
export type GraphNode = {
  id: string;
  label: string;
  type: "org" | "partner" | "project" | "member" | "integration" | "venture";
  meta?: string;
};
export type GraphLink = { source: string; target: string; kind: string };

export function brainMap(member: Member): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodes: GraphNode[] = [{ id: "ciba", label: "CIBA", type: "org", meta: "Central Interior Business Accelerator" }];
  const links: GraphLink[] = [];
  const seen = new Set<string>(["ciba"]);
  const add = (n: GraphNode) => {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      nodes.push(n);
    }
  };

  for (const p of visibleProjects(member)) {
    add({ id: p.id, label: p.name, type: "project", meta: p.programTag });
    links.push({ source: "ciba", target: p.id, kind: "runs" });

    for (const pid of p.partnerIds) {
      const partner = getPartner(pid);
      if (partner) {
        add({ id: partner.id, label: partner.name, type: "partner", meta: partner.kind });
        links.push({ source: p.id, target: partner.id, kind: "with" });
      }
    }
    for (const mid of p.memberIds) {
      const m = getMember(mid);
      if (m) {
        add({ id: `mem-${m.id}`, label: m.name, type: "member", meta: m.title });
        links.push({ source: p.id, target: `mem-${m.id}`, kind: m.id === p.leadMemberId ? "leads" : "works on" });
      }
    }
    for (const iid of p.integrationIds) {
      const integ = getIntegration(iid);
      if (integ) {
        add({ id: integ.id, label: integ.name, type: "integration", meta: integ.provider });
        links.push({ source: p.id, target: integ.id, kind: "uses" });
      }
    }
  }

  for (const v of visibleVentures(member)) {
    add({ id: v.id, label: v.name, type: "venture", meta: v.sector });
    for (const pid of v.projectIds) {
      if (canAccessProject(member, pid) && seen.has(pid)) {
        links.push({ source: pid, target: v.id, kind: "supports" });
      }
    }
  }

  // Social Studio layer — only for members who operate it (marketing + exec).
  if (member.role === "marketing" || member.role === "executive") {
    const posts = readStudioPosts().filter((p) => member.role === "executive" || p.memberId === member.id);
    if (posts.length) {
      add({ id: "social-hub", label: "Social Studio", type: "integration", meta: "YouTube / Instagram / TikTok" });
      links.push({ source: "ciba", target: "social-hub", kind: "publishes via" });
      const channels = new Map<string, string>();
      for (const p of posts) channels.set(p.channelKey, p.channelBrand);
      for (const [key, brand] of channels) {
        const nid = `channel-${key}`;
        add({ id: nid, label: brand, type: "integration", meta: "channel" });
        links.push({ source: "social-hub", target: nid, kind: "runs" });
      }
      for (const p of posts) {
        // Link a post's channel to the collaboration it promotes, when visible.
        if (p.projectId && seen.has(p.projectId)) {
          links.push({ source: `channel-${p.channelKey}`, target: p.projectId, kind: "promotes" });
        }
      }
    }
  }

  return { nodes, links };
}

export const fmtCAD = (n: number) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
