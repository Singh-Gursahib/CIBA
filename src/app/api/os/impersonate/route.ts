import { NextResponse } from "next/server";
import { ADMIN_COOKIE, MEMBER_COOKIE, currentMember, impersonator } from "@/lib/os/auth";
import { getMember } from "@/lib/os/store";

// POST: an executive starts viewing as another member.
export async function POST(req: Request) {
  const me = await currentMember();
  const admin = (await impersonator()) ?? (me?.role === "executive" ? me : null);
  if (!admin) {
    return NextResponse.json({ error: "Only executives can view as another member" }, { status: 403 });
  }
  const { memberId } = await req.json().catch(() => ({}));
  const target = memberId ? getMember(memberId) : null;
  if (!target) return NextResponse.json({ error: "Unknown member" }, { status: 400 });

  const res = NextResponse.json({ ok: true, viewingAs: target.name });
  res.cookies.set(MEMBER_COOKIE, target.id, { path: "/", sameSite: "lax" });
  res.cookies.set(ADMIN_COOKIE, admin.id, { path: "/", sameSite: "lax" });
  return res;
}

// DELETE: return to the executive's own account.
export async function DELETE() {
  const admin = await impersonator();
  const res = NextResponse.json({ ok: true });
  if (admin) {
    res.cookies.set(MEMBER_COOKIE, admin.id, { path: "/", sameSite: "lax" });
  }
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
