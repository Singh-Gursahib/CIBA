"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SocialPost } from "@/types/social";

const ACTIVE_STATUSES = new Set(["rendering", "publishing"]);

/**
 * Client-side post list with live polling. track(id) polls /api/social/posts/[id]
 * while the post is rendering or publishing, and stops once it settles.
 */
export function usePosts(initial: SocialPost[]) {
  const [posts, setPosts] = useState<SocialPost[]>(initial);
  const timers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const upsert = useCallback((post: SocialPost) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id);
      if (idx === -1) return [post, ...prev];
      const next = [...prev];
      next[idx] = post;
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const stop = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) clearInterval(t);
    timers.current.delete(id);
  }, []);

  const track = useCallback(
    (id: string) => {
      stop(id);
      const tick = async () => {
        try {
          const res = await fetch(`/api/social/posts/${id}`, { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as { post: SocialPost };
          upsert(data.post);
          if (!ACTIVE_STATUSES.has(data.post.status)) stop(id);
        } catch {
          // transient error: keep polling
        }
      };
      void tick();
      timers.current.set(id, setInterval(tick, 1500));
    },
    [stop, upsert]
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearInterval(t));
      map.clear();
    };
  }, []);

  return { posts, upsert, remove, track };
}
