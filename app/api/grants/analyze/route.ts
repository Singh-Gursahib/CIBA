import { NextResponse } from "next/server";
import { analyzeFit } from "@/lib/ai/fit-analyst";
import { getDiscovery, setDiscoveryFit } from "@/features/grants/data";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { discoveryId } = (await req.json().catch(() => ({}))) as { discoveryId?: string };
  const discovery = discoveryId ? await getDiscovery(discoveryId) : undefined;
  if (!discovery) return NextResponse.json({ error: "Discovery not found" }, { status: 404 });

  const fit = await analyzeFit(discovery);
  await setDiscoveryFit(discovery.id, fit);
  return NextResponse.json({ fit });
}
