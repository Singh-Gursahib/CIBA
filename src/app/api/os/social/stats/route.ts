import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canOperateSocial } from "@/lib/os/social/access";
import { getAllChannelStats } from "@/lib/os/social/stats";

export const maxDuration = 60;

export async function GET() {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canOperateSocial(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const stats = await getAllChannelStats();
  return NextResponse.json({ stats });
}
