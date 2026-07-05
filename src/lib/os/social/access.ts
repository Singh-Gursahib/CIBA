// Who can operate the Social Studio. Marketing Coordinator + Executive can
// create/render/publish; everyone else can see status only (if at all).

import type { Member } from "@/lib/os/types";
import type { StudioPost } from "./types";

export function canOperateSocial(member: Member): boolean {
  return member.role === "marketing" || member.role === "executive";
}

/** Posts a member may see: executives see all; others see their own. */
export function visibleStudioPosts(member: Member, posts: StudioPost[]): StudioPost[] {
  if (member.role === "executive") return posts;
  return posts.filter((p) => p.memberId === member.id);
}
