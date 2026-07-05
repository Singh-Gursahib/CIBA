import { NextResponse } from "next/server";
import { getAllChannelStats } from "@/lib/social/stats";

export const maxDuration = 60;

/** On-demand YouTube channel headline stats for every channel. */
export async function GET() {
  const stats = await getAllChannelStats();
  return NextResponse.json({ stats });
}
