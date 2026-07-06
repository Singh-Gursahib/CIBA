// Builds the permission-scoped context snapshot the LLM is allowed to see.
// This is THE security boundary for the AI layer: the model never receives
// data outside the member's access — it can't leak what it never saw.

import { readStudioPosts, type StudioPostLite } from "./social/read-sync";
import { listDocs } from "./knowledge/search";
import {
  BALANCE_SHEET,
  FISCAL_YTD,
  FORECAST,
  INCOME_STATEMENT,
  forecastSummary,
  sum,
} from "./finance";
import {
  deadlineRadar,
  fmtCAD,
  fundingRollup,
  getMember,
  getPartner,
  impactRollup,
  visibleDocs,
  visibleFunding,
  visibleIntegrations,
  visibleProjects,
  visibleSocial,
  visibleVentures,
} from "./store";
import type { Member } from "./types";

export { readStudioPosts, type StudioPostLite };

/** One-line summaries of a member's Studio posts (own; executives see all). */
export function studioSummary(member: Member): string[] {
  if (member.role !== "marketing" && member.role !== "executive") return [];
  return readStudioPosts()
    .filter((p) => member.role === "executive" || p.memberId === member.id)
    .slice(0, 20)
    .map((p) => {
      const targets = (p.targets || []).map((t) => `${t.platform}:${t.status}`).join(", ");
      return `${p.channelBrand} "${p.title}" [${p.status}]${targets ? ` (${targets})` : ""}`;
    });
}

export function scopedContext(member: Member): string {
  const parts: string[] = [];

  parts.push(
    `SIGNED-IN MEMBER: ${member.name} (${member.title}). ` +
      `Access: ${member.projectAccess === "*" ? "ALL collaborations" : `${(member.projectAccess as string[]).length} collaborations`}.`,
  );

  const projects = visibleProjects(member);
  parts.push(
    "COLLABORATIONS VISIBLE TO THIS MEMBER:\n" +
      projects
        .map((p) => {
          const partners = p.partnerIds.map((id) => getPartner(id)?.name).filter(Boolean).join(", ");
          const lead = getMember(p.leadMemberId)?.name;
          return `- ${p.name} [${p.status}] with ${partners}. Lead: ${lead}. ${p.summary}`;
        })
        .join("\n"),
  );

  const funding = visibleFunding(member);
  if (funding.length) {
    parts.push(
      "FUNDING RECORDS:\n" +
        funding
          .map(
            (f) =>
              `- ${f.source} → ${projects.find((p) => p.id === f.projectId)?.name}: ${fmtCAD(f.amountCAD)} (${f.kind}, ${f.status})` +
              (f.reportDeadline ? ` — report due ${f.reportDeadline}` : "") +
              `. ${f.notes}`,
          )
          .join("\n"),
    );
  }

  const deadlines = deadlineRadar(member);
  if (deadlines.length) {
    parts.push(
      "UPCOMING REPORT DEADLINES (soonest first): " +
        deadlines.map((f) => `${f.source} on ${f.reportDeadline}`).join("; "),
    );
  }

  const ventures = visibleVentures(member);
  if (ventures.length) {
    parts.push(
      "VENTURES IN VISIBLE PROGRAMS:\n" +
        ventures
          .map(
            (v) =>
              `- ${v.name} (${v.founder}, ${v.sector}, ${v.stage}): ${v.metrics.jobs} jobs, ${fmtCAD(v.metrics.revenueCAD)} revenue, ${fmtCAD(v.metrics.raisedCAD)} raised`,
          )
          .join("\n"),
    );
  }

  const impact = impactRollup(member);
  const fr = fundingRollup(member);
  parts.push(
    `ROLLUPS: ${impact.ventures} ventures, ${impact.jobs} jobs, ${fmtCAD(impact.revenueCAD)} venture revenue. ` +
      `Funding: ${fmtCAD(fr.receivedCAD)} received, ${fmtCAD(fr.committedCAD)} committed, ${fmtCAD(fr.appliedCAD)} in applications.`,
  );

  const docs = visibleDocs(member);
  if (docs.length) {
    parts.push(
      "DOCUMENTS VISIBLE TO THIS MEMBER (metadata):\n" +
        docs.map((d) => `- ${d.name} (${d.type}, updated ${d.updated})`).join("\n"),
    );
  }

  const social = visibleSocial(member);
  if (social.length) {
    parts.push(
      "SOCIAL POSTS:\n" +
        social
          .map(
            (s) =>
              `- [${s.status}] ${s.channel} ${s.date}: "${s.content}"` +
              (s.engagement ? ` (${s.engagement.views} views, ${s.engagement.clicks} clicks)` : ""),
          )
          .join("\n"),
    );
  }

  // Real Social Studio posts (only for members who operate social).
  if (member.role === "marketing" || member.role === "executive") {
    const studio = readStudioPosts().filter((p) => member.role === "executive" || p.memberId === member.id);
    if (studio.length) {
      parts.push(
        "SOCIAL STUDIO (real video posts this member operates):\n" +
          studio
            .slice(0, 20)
            .map((p) => {
              const targets = (p.targets || [])
                .map((t) => `${t.platform}:${t.status}`)
                .join(", ");
              return `- [${p.status}] ${p.channelBrand} "${p.title}" (${p.format}${targets ? ", " + targets : ""})`;
            })
            .join("\n"),
      );
    }
  }

  parts.push(
    "CIBA KNOWLEDGE BASE (reference docs the member can cite):\n" +
      listDocs().map((d) => `- ${d.title} (${d.type}): ${d.summary}`).join("\n"),
  );

  parts.push(
    "INTEGRATIONS THIS MEMBER OPERATES: " +
      visibleIntegrations(member)
        .map((i) => `${i.name} (${i.provider}, ${i.status})`)
        .join("; "),
  );

  // Finance statements only for members with ledger access.
  const hasFinance = member.integrationAccess === "*" || member.integrationAccess.includes("int-quickbooks");
  if (hasFinance) {
    const rev = sum(INCOME_STATEMENT.revenue);
    const exp = sum(INCOME_STATEMENT.expenses);
    const fc = forecastSummary();
    parts.push(
      `FINANCE (${FISCAL_YTD}): revenue ${fmtCAD(rev)}, expenses ${fmtCAD(exp)}, surplus ${fmtCAD(rev - exp)}. ` +
        `Cash ${fmtCAD(BALANCE_SHEET.assets.current[0].amount)}. ` +
        `3-month forecast closing cash: ${fc.map((m) => `${m.month} ${fmtCAD(m.closingCash)}`).join(", ")}. ` +
        `Forecast assumptions: ${FORECAST.map((m) => m.inflows.map((i) => i.label).join(" + ")).join(" | ")}.`,
    );
  } else {
    parts.push("FINANCE: this member does NOT have finance access. Decline finance questions and point them to Sofia Marques or Sachin Singh.");
  }

  return parts.join("\n\n");
}
