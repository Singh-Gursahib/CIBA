import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { SocialView } from "@/features/social/social-view";
import { listPosts } from "@/features/social/data";
import { allChannels } from "@/lib/social/channels";
import { platformConfigured } from "@/lib/social/publish";
import { isMockPublish } from "@/lib/config";
import type { ChannelVM } from "@/features/social/post-composer";

export const metadata: Metadata = { title: "Social Media" };
export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const posts = await listPosts();
  const mockMode = isMockPublish();

  const channels: ChannelVM[] = allChannels().map((c) => ({
    key: c.key,
    brand: c.brand,
    blurb: c.blurb,
    platforms: {
      youtube: platformConfigured(c.key, "youtube"),
      instagram: platformConfigured(c.key, "instagram"),
    },
  }));

  return (
    <div className="enter space-y-8">
      <PageHeader
        title="Social Media"
        description="Create short-form video content and publish it to YouTube and Instagram from one place."
        actions={
          mockMode ? (
            <Badge tone="amber">Mock mode — no accounts published</Badge>
          ) : (
            <Badge tone="sage">Live — real accounts</Badge>
          )
        }
      />
      <SocialView posts={posts} channels={channels} mockMode={mockMode} />
    </div>
  );
}
