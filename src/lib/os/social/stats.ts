// On-demand analytics for the Social Studio. Mock returns stable pseudo-numbers;
// real mode uses the ported YouTube/Instagram stats calls. Never polled.

import { isMockPublish } from "./config";
import { allChannels, getChannel, channelCreds, type ChannelKey } from "./channels";
import { fetchChannelStats, fetchVideoStats } from "./youtube";
import { fetchReelInsights } from "./instagram";
import { platformConfigured } from "./publish";
import type { StudioPost } from "./types";

export interface ChannelStatsVM {
  channelKey: ChannelKey;
  brand: string;
  configured: boolean;
  subscribers?: number;
  views?: number;
  videoCount?: number;
  error?: string;
}

export interface Metric {
  label: string;
  value: number;
}
export interface PostInsight {
  platform: "youtube" | "instagram";
  externalId: string;
  url?: string;
  metrics: Metric[];
}

function seeded(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

export async function getAllChannelStats(): Promise<ChannelStatsVM[]> {
  const mock = isMockPublish();
  return Promise.all(
    allChannels().map(async (ch): Promise<ChannelStatsVM> => {
      const configured = platformConfigured(ch.key, "youtube");
      const base: ChannelStatsVM = { channelKey: ch.key, brand: ch.brand, configured };
      if (mock) {
        return {
          ...base,
          configured: true,
          subscribers: seeded(ch.key + "s", 120, 4200),
          views: seeded(ch.key + "v", 8000, 260000),
          videoCount: seeded(ch.key + "c", 6, 90),
        };
      }
      if (!configured) return base;
      try {
        const stats = await fetchChannelStats(channelCreds(ch).youtube);
        if (!stats) return { ...base, error: "No stats available (check scopes)" };
        return { ...base, subscribers: stats.subscribers, views: stats.views, videoCount: stats.videoCount };
      } catch (err) {
        return { ...base, error: err instanceof Error ? err.message : "Failed to load" };
      }
    }),
  );
}

export async function getPostInsights(post: StudioPost): Promise<PostInsight[]> {
  const mock = isMockPublish();
  const published = post.targets.filter((t) => t.status === "published" && t.externalId);
  const creds = channelCreds(getChannel(post.channelKey));

  return Promise.all(
    published.map(async (t): Promise<PostInsight> => {
      const base = { platform: t.platform, externalId: t.externalId!, url: t.url };
      if (mock) {
        const s = t.externalId!;
        return {
          ...base,
          metrics:
            t.platform === "youtube"
              ? [
                  { label: "Views", value: seeded(s + "v", 200, 90000) },
                  { label: "Likes", value: seeded(s + "l", 10, 5000) },
                  { label: "Comments", value: seeded(s + "c", 0, 400) },
                ]
              : [
                  { label: "Views", value: seeded(s + "v", 200, 90000) },
                  { label: "Reach", value: seeded(s + "r", 150, 70000) },
                  { label: "Likes", value: seeded(s + "l", 10, 5000) },
                  { label: "Saves", value: seeded(s + "sv", 0, 900) },
                ],
        };
      }
      try {
        if (t.platform === "youtube") {
          const [v] = await fetchVideoStats([t.externalId!], undefined, creds.youtube);
          return {
            ...base,
            metrics: [
              { label: "Views", value: v?.views ?? 0 },
              { label: "Likes", value: v?.likes ?? 0 },
              { label: "Comments", value: v?.comments ?? 0 },
            ],
          };
        }
        const ig = await fetchReelInsights(t.externalId!, creds.instagram);
        return {
          ...base,
          metrics: [
            { label: "Views", value: ig.views },
            { label: "Reach", value: ig.reach },
            { label: "Likes", value: ig.likes },
            { label: "Saves", value: ig.saves },
          ],
        };
      } catch {
        return { ...base, metrics: [] };
      }
    }),
  );
}
