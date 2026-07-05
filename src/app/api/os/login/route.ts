import { NextResponse } from "next/server";
import { MEMBER_COOKIE } from "@/lib/os/auth";
import { getMember } from "@/lib/os/store";

export async function POST(req: Request) {
  const { memberId } = await req.json().catch(() => ({}));
  if (!memberId || !getMember(memberId)) {
    return NextResponse.json({ error: "Unknown member" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(MEMBER_COOKIE, memberId, { path: "/", httpOnly: false, sameSite: "lax" });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(MEMBER_COOKIE);
  return res;
}
