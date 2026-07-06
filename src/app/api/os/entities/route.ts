// Create endpoint for the operable OS. One POST handles every entity a member
// can add from the UI — venture, funding record, document, or a new
// collaboration — with the same permission scoping the reads use: you can only
// attach records to a collaboration you can access, and only an executive can
// stand up a new collaboration. Everything is persisted to the overlay and
// shows up immediately in the scoped reads, rollups, and brain map.

import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canAccessProject } from "@/lib/os/store";
import { addDoc, addFunding, addProject, addVenture, logActivity } from "@/lib/os/overlay";
import type { Doc, FundingRecord, Project, Venture } from "@/lib/os/types";

function id(prefix: string): string {
  return `o-${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
const nowISO = () => new Date().toISOString();
const today = () => nowISO().slice(0, 10);
const str = (v: unknown, max = 400): string => String(v ?? "").trim().slice(0, max);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const type = str(body.type);

  // --- Venture: attach to one accessible collaboration ---
  if (type === "venture") {
    const projectId = str(body.projectId);
    if (!projectId || !canAccessProject(member, projectId)) {
      return NextResponse.json({ error: "Pick a collaboration you have access to." }, { status: 403 });
    }
    const name = str(body.name, 120);
    if (!name) return NextResponse.json({ error: "Venture name is required." }, { status: 400 });
    const stages = ["idea", "validation", "growth", "operating"] as const;
    const stage = (stages as readonly string[]).includes(str(body.stage))
      ? (str(body.stage) as Venture["stage"])
      : "idea";
    const venture: Venture = {
      id: id("v"),
      name,
      founder: str(body.founder, 120) || "—",
      sector: str(body.sector, 60) || "General",
      projectIds: [projectId],
      stage,
      metrics: {
        jobs: num(body.jobs),
        revenueCAD: num(body.revenueCAD),
        raisedCAD: num(body.raisedCAD),
      },
    };
    addVenture(venture);
    logActivity({ id: id("a"), when: nowISO(), memberId: member.id, projectId, action: `added venture “${name}”` });
    return NextResponse.json({ ok: true, venture });
  }

  // --- Funding record ---
  if (type === "funding") {
    const projectId = str(body.projectId);
    if (!projectId || !canAccessProject(member, projectId)) {
      return NextResponse.json({ error: "Pick a collaboration you have access to." }, { status: 403 });
    }
    const source = str(body.source, 120);
    if (!source) return NextResponse.json({ error: "Funding source is required." }, { status: 400 });
    const kinds = ["grant", "sponsorship", "program-delivery", "co-investment"] as const;
    const statuses = ["received", "committed", "applied", "reporting-due"] as const;
    const kind = (kinds as readonly string[]).includes(str(body.kind)) ? (str(body.kind) as FundingRecord["kind"]) : "grant";
    const status = (statuses as readonly string[]).includes(str(body.status))
      ? (str(body.status) as FundingRecord["status"])
      : "applied";
    const reportDeadline = str(body.reportDeadline) || undefined;
    const record: FundingRecord = {
      id: id("f"),
      projectId,
      source,
      kind,
      amountCAD: num(body.amountCAD),
      status,
      reportDeadline,
      notes: str(body.notes, 300),
    };
    addFunding(record);
    logActivity({ id: id("a"), when: nowISO(), memberId: member.id, projectId, action: `logged ${kind} from ${source}` });
    return NextResponse.json({ ok: true, funding: record });
  }

  // --- Document ---
  if (type === "doc") {
    const projectId = str(body.projectId);
    if (!projectId || !canAccessProject(member, projectId)) {
      return NextResponse.json({ error: "Pick a collaboration you have access to." }, { status: 403 });
    }
    const name = str(body.name, 160);
    if (!name) return NextResponse.json({ error: "Document name is required." }, { status: 400 });
    const types = ["agreement", "report", "deck", "budget", "notes", "application"] as const;
    const docType = (types as readonly string[]).includes(str(body.docType)) ? (str(body.docType) as Doc["type"]) : "notes";
    const doc: Doc = {
      id: id("d"),
      projectId,
      name,
      type: docType,
      updated: today(),
      owner: member.id,
      sensitive: body.sensitive === true || str(body.sensitive) === "true",
    };
    addDoc(doc);
    logActivity({ id: id("a"), when: nowISO(), memberId: member.id, projectId, action: `uploaded document “${name}”` });
    return NextResponse.json({ ok: true, doc });
  }

  // --- Collaboration (new project): executives only, since it defines a new
  //     access scope. The creator becomes lead and the only member on it. ---
  if (type === "project") {
    if (member.role !== "executive") {
      return NextResponse.json({ error: "Only the Executive Director can create a collaboration." }, { status: 403 });
    }
    const name = str(body.name, 120);
    if (!name) return NextResponse.json({ error: "Collaboration name is required." }, { status: 400 });
    const statuses = ["active", "planning", "wrapped"] as const;
    const status = (statuses as readonly string[]).includes(str(body.status)) ? (str(body.status) as Project["status"]) : "planning";
    const project: Project = {
      id: id("p"),
      name,
      status,
      summary: str(body.summary, 400) || "New collaboration.",
      partnerIds: [],
      leadMemberId: member.id,
      memberIds: [member.id],
      integrationIds: [],
      programTag: str(body.programTag, 80) || "New program",
      start: today(),
    };
    addProject(project);
    logActivity({ id: id("a"), when: nowISO(), memberId: member.id, projectId: project.id, action: `created collaboration “${name}”` });
    return NextResponse.json({ ok: true, project });
  }

  return NextResponse.json({ error: `Unknown entity type: ${type}` }, { status: 400 });
}
