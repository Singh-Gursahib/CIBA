import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canAccessProject } from "@/lib/os/store";
import { canUseMarketing } from "@/lib/os/marketing/access";
import { insertVideoJob, listVideoJobs } from "@/lib/os/marketing/store";
import { videoProvider } from "@/lib/os/marketing/video";
import type { MarketingVideoJob, VideoAspect } from "@/lib/os/marketing/types";

const ASPECTS: VideoAspect[] = ["mobile", "square", "landscape"];

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** List the current member's video jobs (executive sees all). */
export async function GET() {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canUseMarketing(member))
    return NextResponse.json({ error: "Marketing Studio is limited to Marketing and the Executive." }, { status: 403 });
  const all = await listVideoJobs();
  const jobs = member.role === "executive" ? all : all.filter((j) => j.memberId === member.id);
  return NextResponse.json({ jobs });
}

/** Start a new recap-video render job. */
export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canUseMarketing(member))
    return NextResponse.json({ error: "Marketing Studio is limited to Marketing and the Executive." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Add a title for the video." }, { status: 400 });

  const brief = String(body?.brief ?? "").trim() || undefined;
  const aspect: VideoAspect = ASPECTS.includes(body?.aspect) ? body.aspect : "landscape";
  const projectIdRaw = String(body?.projectId ?? "").trim() || undefined;
  const projectId = projectIdRaw && canAccessProject(member, projectIdRaw) ? projectIdRaw : undefined;

  const now = new Date().toISOString();
  const job: MarketingVideoJob = {
    id: newId(),
    memberId: member.id,
    projectId,
    title,
    brief,
    aspect,
    status: "generating",
    progress: 0,
    stage: "Storyboarding scenes",
    createdAt: now,
    startedAt: now,
  };

  const { providerJobId } = await videoProvider.start(job);
  job.providerJobId = providerJobId;
  await insertVideoJob(job);

  return NextResponse.json({ job });
}
