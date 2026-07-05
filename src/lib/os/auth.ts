// Demo auth: which team member is "signed in" lives in a cookie.
// Server components and API routes resolve the member from it; all data
// access then flows through the permission-scoped store.

import { cookies } from "next/headers";
import { getMember } from "./store";
import type { Member } from "./types";

export const MEMBER_COOKIE = "ciba_member";
export const ADMIN_COOKIE = "ciba_admin"; // set while an executive is impersonating

export async function currentMember(): Promise<Member | null> {
  const jar = await cookies();
  const id = jar.get(MEMBER_COOKIE)?.value;
  return (id && getMember(id)) || null;
}

/** The executive behind an active "view as" session, if any. */
export async function impersonator(): Promise<Member | null> {
  const jar = await cookies();
  const id = jar.get(ADMIN_COOKIE)?.value;
  const m = id ? getMember(id) : null;
  return m && m.role === "executive" ? m : null;
}
