import type { Member } from "@/lib/os/types";

/** Marketing Studio is for the Marketing Coordinator and the Executive. */
export function canUseMarketing(member: Member): boolean {
  return member.role === "marketing" || member.role === "executive";
}
