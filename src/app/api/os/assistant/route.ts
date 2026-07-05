import { generateText } from "ai";
import { NextResponse } from "next/server";
import { AI_ENABLED, model } from "@/lib/ai";
import { currentMember } from "@/lib/os/auth";
import { scopedContext, studioSummary } from "@/lib/os/context";
import { deadlineRadar, fmtCAD, fundingRollup, impactRollup, visibleFunding, visibleProjects, visibleSocial, visibleVentures } from "@/lib/os/store";
import type { Member } from "@/lib/os/types";

// Demo-mode answers: simple keyword routing over the member's scoped data,
// so the assistant works (and demonstrates permission-scoping) without a key.
function demoAnswer(member: Member, q: string): string {
  const query = q.toLowerCase();
  const projects = visibleProjects(member);

  if (/deadline|report|due/.test(query)) {
    const d = deadlineRadar(member);
    if (!d.length) return "No report deadlines are visible in your scope.";
    return (
      "Upcoming funder report deadlines in your scope:\n" +
      d.map((f) => `• ${f.source} — due ${f.reportDeadline} (${fmtCAD(f.amountCAD)}). ${f.notes}`).join("\n")
    );
  }
  if (/fund|money|grant|sponsor|budget|cash/.test(query)) {
    const fr = fundingRollup(member);
    const recs = visibleFunding(member);
    return (
      `Funding visible to you: ${fmtCAD(fr.receivedCAD)} received, ${fmtCAD(fr.committedCAD)} committed, ${fmtCAD(fr.appliedCAD)} in applications.\n` +
      recs.map((f) => `• ${f.source}: ${fmtCAD(f.amountCAD)} (${f.status})`).join("\n") +
      (member.integrationAccess === "*" || member.integrationAccess.includes("int-quickbooks")
        ? "\nFull statements and the 3-month forecast are in the Finance tab."
        : "\nYou don't have finance-ledger access — ask Sofia or Sachin for statement detail.")
    );
  }
  if (/venture|compan|founder|impact|jobs/.test(query)) {
    const vs = visibleVentures(member);
    const im = impactRollup(member);
    return (
      `You can see ${vs.length} ventures: ${im.jobs} jobs, ${fmtCAD(im.revenueCAD)} combined revenue.\n` +
      vs.map((v) => `• ${v.name} (${v.sector}, ${v.stage}) — ${v.founder}`).join("\n")
    );
  }
  if (/social|post|publish|youtube|instagram|reel|video|content|studio/.test(query)) {
    const studio = studioSummary(member);
    const seed = visibleSocial(member);
    const lines: string[] = [];
    if (studio.length) lines.push("Social Studio videos:\n" + studio.map((s) => `• ${s}`).join("\n"));
    if (seed.length) lines.push("Scheduled / published posts:\n" + seed.map((s) => `• [${s.status}] ${s.channel} — ${s.content}`).join("\n"));
    return lines.length ? lines.join("\n\n") : "No social content in your scope yet. Create one in the Social Studio (/os/social).";
  }
  if (/project|collab|program|partner/.test(query)) {
    return (
      `You have access to ${projects.length} collaborations:\n` +
      projects.map((p) => `• ${p.name} [${p.status}] — ${p.programTag}`).join("\n")
    );
  }
  return (
    `I can answer about the ${projects.length} collaborations in your scope — try asking about funding, ` +
    "report deadlines, ventures, partners, or social activity. (Demo mode: add an Anthropic key for full reasoning.)"
  );
}

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { question } = await req.json().catch(() => ({}));
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  if (!AI_ENABLED) {
    return NextResponse.json({ answer: demoAnswer(member, question), mode: "demo" });
  }

  try {
    const { text } = await generateText({
      model,
      system:
        "You are the CIBA OS assistant for the Central Interior Business Accelerator (Kamloops, BC). " +
        "Answer ONLY from the scoped data below — it already reflects exactly what this member is allowed to see. " +
        "If asked about something outside it (other projects, restricted finance, sensitive docs), say it's outside " +
        "their access and name who to ask. Be concise and concrete; use bullet lists for multiple items.\n\n" +
        scopedContext(member),
      prompt: question,
    });
    return NextResponse.json({ answer: text, mode: "ai" });
  } catch (err) {
    console.error("assistant AI error, demo fallback:", err);
    return NextResponse.json({ answer: demoAnswer(member, question), mode: "demo-fallback" });
  }
}
