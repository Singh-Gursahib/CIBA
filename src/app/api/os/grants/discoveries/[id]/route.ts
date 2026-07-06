import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canUseGrants } from "@/lib/os/grants/access";
import { patchDiscovery } from "@/lib/os/grants/store";
import type { DiscoveryStatus } from "@/lib/os/grants/types";

const ALLOWED: DiscoveryStatus[] = ["new", "seen", "shortlisted", "dismissed", "proposal_started"];

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const member = await currentMember();
  if (!member || !canUseGrants(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await ctx.params;
  const { status } = await req.json().catch(() => ({}));
  if (!ALLOWED.includes(status)) return NextResponse.json({ error: "Bad status" }, { status: 400 });
  const updated = await patchDiscovery(id, { status });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ discovery: updated });
}
