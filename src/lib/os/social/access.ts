// Who can operate the Social Studio, who can approve, and post visibility.

import type { Member } from "@/lib/os/types";
import type { StudioPost } from "./types";

/** Create / render / publish. Marketing Coordinator + Executive. */
export function canOperateSocial(member: Member): boolean {
  return member.role === "marketing" || member.role === "executive";
}

/** Sign off on a post before it can go public. Executive only. */
export function canApprove(member: Member): boolean {
  return member.role === "executive";
}

/** Posts a member may see: executives see all; others see their own. */
export function visibleStudioPosts(member: Member, posts: StudioPost[]): StudioPost[] {
  if (member.role === "executive") return posts;
  return posts.filter((p) => p.memberId === member.id);
}
