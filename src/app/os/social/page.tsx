import { Lock } from "lucide-react";
import { currentMember } from "@/lib/os/auth";
import { visibleProjects } from "@/lib/os/store";
import { canOperateSocial, visibleStudioPosts } from "@/lib/os/social/access";
import { allChannels } from "@/lib/os/social/channels";
import { platformConfigured } from "@/lib/os/social/publish";
import { isMockPublish } from "@/lib/os/social/config";
import { listPosts } from "@/lib/os/social/store";
import { SocialStudio, type ChannelVM } from "./studio";

export default async function SocialPage() {
  const member = (await currentMember())!;

  // Role gate — matches the OS's scoped-access ethos.
  if (!canOperateSocial(member)) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Social Studio</h1>
          <p className="text-sm text-muted mt-1">Create and publish video content to YouTube and Instagram.</p>
        </div>
        <div className="card p-8 text-center">
          <div className="grid place-items-center w-12 h-12 rounded-full bg-brand-soft mx-auto"><Lock className="w-5 h-5 text-brand" strokeWidth={1.75} /></div>
          <p className="mt-3 font-semibold">This studio is scoped to Marketing</p>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">
            Creating and publishing social content is limited to the Marketing Coordinator (Jake Williams) and the
            Executive Director. Ask Jake to queue a post for your collaboration.
          </p>
        </div>
      </div>
    );
  }

  const posts = visibleStudioPosts(member, await listPosts());
  const channels: ChannelVM[] = allChannels().map((c) => ({
    key: c.key,
    brand: c.brand,
    blurb: c.blurb,
    platforms: {
      youtube: platformConfigured(c.key, "youtube"),
      instagram: platformConfigured(c.key, "instagram"),
      tiktok: platformConfigured(c.key, "tiktok"),
    },
  }));
  const projects = visibleProjects(member).map((p) => ({ id: p.id, name: p.name }));

  return (
    <SocialStudio
      posts={posts}
      channels={channels}
      projects={projects}
      mockPublish={isMockPublish()}
      isExecutive={member.role === "executive"}
    />
  );
}
