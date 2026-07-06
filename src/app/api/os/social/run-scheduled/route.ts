import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canOperateSocial } from "@/lib/os/social/access";
import { runScheduled } from "@/lib/os/social/run";

export const maxDuration = 300;

/**
 * Publishes every approved post whose scheduled time has arrived. In production
 * this would be a cron trigger; here it's a manual button on the calendar.
 */
export async function POST() {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canOperateSocial(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const result = await runScheduled();
  return NextResponse.json(result);
}
