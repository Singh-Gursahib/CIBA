import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canAccessProject } from "@/lib/os/store";
import { canUseMarketing } from "@/lib/os/marketing/access";
import { insertJob } from "@/lib/os/marketing/store";
import { ALL_FORMATS, buildPosterSvg, type PosterFormat } from "@/lib/os/marketing/poster";
import type { MarketingJob } from "@/lib/os/marketing/types";

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canUseMarketing(member)) return NextResponse.json({ error: "Marketing Studio is limited to Marketing and the Executive." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Add a title or headline." }, { status: 400 });
  const formats: PosterFormat[] = Array.isArray(body?.formats) ? body.formats.filter((f: string) => (ALL_FORMATS as string[]).includes(f)) : [];
  if (formats.length === 0) return NextResponse.json({ error: "Choose at least one format." }, { status: 400 });

  const eyebrow = String(body?.eyebrow ?? "").trim() || undefined;
  const details = String(body?.details ?? "").trim() || undefined;
  const cta = String(body?.cta ?? "").trim() || undefined;
  const projectIdRaw = String(body?.projectId ?? "").trim() || undefined;
  const projectId = projectIdRaw && canAccessProject(member, projectIdRaw) ? projectIdRaw : undefined;

  const job: MarketingJob = {
    id: newId(),
    memberId: member.id,
    projectId,
    eyebrow,
    title,
    details,
    cta,
    formats,
    outputs: formats.map((format) => ({ format, svg: buildPosterSvg({ format, eyebrow, title, details, cta }) })),
    createdAt: new Date().toISOString(),
  };
  await insertJob(job);
  return NextResponse.json({ job });
}
