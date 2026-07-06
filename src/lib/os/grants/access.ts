import type { Member } from "@/lib/os/types";

/** Grants (locator + proposals) are for the Funding lead and the Executive. */
export function canUseGrants(member: Member): boolean {
  return member.role === "funding" || member.role === "executive";
}
