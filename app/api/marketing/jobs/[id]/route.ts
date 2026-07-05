import { NextResponse } from "next/server";
import { getJob, patchJob } from "@/features/marketing/data";
import { videoProvider } from "@/lib/video/provider";
import { nowIso } from "@/lib/utils/dates";

/**
 * Poll endpoint for job progress. For video jobs the provider is consulted
 * on each poll (the stub derives progress from elapsed time).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (job.kind === "video" && job.status === "generating") {
    const poll = await videoProvider.poll(job);
    if (poll.status === "ready") {
      const updated = await patchJob(id, {
        status: "ready",
        videoOutputUrl: poll.url,
        completedAt: nowIso(),
      });
      return NextResponse.json({ job: updated, video: { ...poll } });
    }
    if (poll.status === "failed") {
      const updated = await patchJob(id, { status: "failed", error: "Video generation failed" });
      return NextResponse.json({ job: updated, video: { ...poll } });
    }
    return NextResponse.json({ job, video: poll });
  }

  return NextResponse.json({ job });
}
