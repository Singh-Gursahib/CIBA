// Publish orchestration shared by the publish route and the scheduler:
// publishes each pending target one at a time, saving results incrementally.

import { getPost, patchPost, listPosts } from "./store";
import { publishToPlatform, platformConfigured } from "./publish";
import { isMockPublish } from "./config";
import type { StudioPost, TargetStatus } from "./types";

export async function runPublish(postId: string): Promise<StudioPost | undefined> {
  const post = await getPost(postId);
  if (!post) return undefined;
  const mock = isMockPublish();
  const pending = post.targets.filter((t) => t.status !== "published").map((t) => t.platform);

  await patchPost(postId, (p) => ({
    ...p,
    status: "publishing",
    error: undefined,
    targets: p.targets.map((t) =>
      pending.includes(t.platform) ? { ...t, status: "publishing" as TargetStatus, error: undefined } : t,
    ),
  }));

  for (const platform of pending) {
    if (!mock && !platformConfigured(post.channelKey, platform)) {
      await patchPost(postId, (p) => ({
        ...p,
        targets: p.targets.map((t) => (t.platform === platform ? { ...t, status: "skipped", error: "No credentials for this channel" } : t)),
      }));
      continue;
    }
    try {
      const current = (await getPost(postId))!;
      const result = await publishToPlatform(platform, current);
      await patchPost(postId, (p) => ({
        ...p,
        targets: p.targets.map((t) =>
          t.platform === platform ? { ...t, status: "published", externalId: result.externalId, url: result.url, error: undefined } : t,
        ),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      await patchPost(postId, (p) => ({
        ...p,
        targets: p.targets.map((t) => (t.platform === platform ? { ...t, status: "failed", error: message } : t)),
      }));
    }
  }

  return patchPost(postId, (p) => {
    const anyPublished = p.targets.some((t) => t.status === "published");
    const firstError = p.targets.find((t) => t.status === "failed")?.error;
    return {
      ...p,
      status: anyPublished ? "published" : "failed",
      error: anyPublished ? undefined : firstError ?? "All platforms failed",
      publishedAt: anyPublished ? new Date().toISOString() : p.publishedAt,
    };
  });
}

/** Publish every post whose scheduled time has arrived and that is approved. */
export async function runScheduled(): Promise<{ published: number; ids: string[] }> {
  const now = new Date().toISOString();
  const due = (await listPosts()).filter(
    (p) =>
      p.scheduledFor &&
      p.scheduledFor <= now &&
      p.approval === "approved" &&
      p.mediaPath &&
      (p.status === "ready" || p.status === "failed") &&
      p.targets.some((t) => t.status !== "published"),
  );
  const ids: string[] = [];
  for (const p of due) {
    await runPublish(p.id);
    ids.push(p.id);
  }
  return { published: ids.length, ids };
}
