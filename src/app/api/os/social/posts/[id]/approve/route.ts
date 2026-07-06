import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canApprove } from "@/lib/os/social/access";
import { getPost, patchPost } from "@/lib/os/social/store";

/** Executive approves or rejects a Marketing draft before it can be published. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canApprove(member)) return NextResponse.json({ error: "Only the Executive Director can approve posts." }, { status: 403 });

  const { id } = await ctx.params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const decision = body?.decision === "reject" ? "rejected" : "approved";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const now = new Date().toISOString();

  const updated = await patchPost(id, (p) => ({
    ...p,
    approval: decision,
    approvedBy: member.id,
    approvedAt: now,
    rejectionReason: decision === "rejected" ? reason || "No reason given" : undefined,
  }));
  return NextResponse.json({ post: updated });
}
