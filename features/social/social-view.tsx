"use client";

import { Share2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { usePosts } from "@/features/social/use-posts";
import { PostComposer, type ChannelVM } from "@/features/social/post-composer";
import { PostCard } from "@/features/social/post-card";
import { ChannelStats } from "@/features/social/channel-stats";
import type { SocialPost } from "@/types/social";

export function SocialView({
  posts: initialPosts,
  channels,
  mockMode,
}: {
  posts: SocialPost[];
  channels: ChannelVM[];
  mockMode: boolean;
}) {
  const { posts, upsert, remove, track } = usePosts(initialPosts);

  const onCreated = (post: SocialPost, needsRender: boolean) => {
    upsert(post);
    if (needsRender) {
      // Kick the render job, then poll for progress.
      void fetch("/api/social/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      }).catch(() => {});
      track(post.id);
    }
  };

  return (
    <div className="space-y-6">
      <ChannelStats />
      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      <div className="xl:sticky xl:top-6 xl:self-start">
        <PostComposer channels={channels} mockMode={mockMode} onCreated={onCreated} />
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <EmptyState
            icon={<Share2 />}
            title="No posts yet"
            description="Pick a channel, describe a video, and create your first draft. We generate the copy and, in mock mode, a sample render you can publish."
          />
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onUpdate={upsert} onRemove={remove} track={track} />
          ))
        )}
      </div>
      </div>
    </div>
  );
}
