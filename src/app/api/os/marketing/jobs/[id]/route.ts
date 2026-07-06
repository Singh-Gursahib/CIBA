import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canUseMarketing } from "@/lib/os/marketing/access";
import { deleteJob, listJobs } from "@/lib/os/marketing/store";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (!member || !canUseMarketing(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  const job = (await listJobs()).find((j) => j.id === id);
  if (job && job.memberId !== member.id && member.role !== "executive") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  await deleteJob(id);
  return NextResponse.json({ ok: true });
}
