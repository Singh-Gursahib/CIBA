import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canUseGrants } from "@/lib/os/grants/access";
import { getDiscovery, patchDiscovery } from "@/lib/os/grants/store";
import { analyzeFit } from "@/lib/os/grants/ai";

export const maxDuration = 120;

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member || !canUseGrants(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { discoveryId } = await req.json().catch(() => ({}));
  const discovery = await getDiscovery(discoveryId);
  if (!discovery) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const fit = await analyzeFit(discovery);
  const updated = await patchDiscovery(discovery.id, { fit });
  return NextResponse.json({ discovery: updated });
}
