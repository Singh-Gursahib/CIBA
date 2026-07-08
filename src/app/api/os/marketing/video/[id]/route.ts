import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canUseMarketing } from "@/lib/os/marketing/access";
import { deleteVideoJob, getVideoJob, updateVideoJob } from "@/lib/os/marketing/store";
import { videoProvider } from "@/lib/os/marketing/video";

/** Poll a video job: advances progress from the provider and returns the job. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (!member || !canUseMarketing(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;

  const job = await getVideoJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.memberId !== member.id && member.role !== "executive")
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  // Terminal jobs are returned as-is; otherwise ask the provider for progress.
  if (job.status !== "generating") return NextResponse.json({ job });

  const result = await videoProvider.poll(job);
  const updated = await updateVideoJob(id, {
    status: result.status,
    progress: result.progress,
    stage: result.stage,
    videoUrl: result.status === "ready" ? result.url : job.videoUrl,
  });
  return NextResponse.json({ job: updated ?? job });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (!member || !canUseMarketing(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  const job = await getVideoJob(id);
  if (job && job.memberId !== member.id && member.role !== "executive")
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await deleteVideoJob(id);
  return NextResponse.json({ ok: true });
}
