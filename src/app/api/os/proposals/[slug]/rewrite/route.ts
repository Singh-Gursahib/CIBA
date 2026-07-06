import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canUseGrants } from "@/lib/os/grants/access";
import { rewriteText } from "@/lib/os/grants/ai";

export const maxDuration = 120;

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member || !canUseGrants(member)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { scope, text, instruction } = await req.json().catch(() => ({}));
  if (typeof text !== "string" || typeof instruction !== "string") {
    return NextResponse.json({ error: "Missing text/instruction" }, { status: 400 });
  }
  const result = await rewriteText(scope === "document" ? "document" : "selection", text, instruction);
  return NextResponse.json({ text: result });
}
