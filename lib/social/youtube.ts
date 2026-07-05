/**
 * YouTube publishing — dependency-free (no googleapis), streams the upload so a
 * 400 MB video never loads into memory. Runs from a CLI / cron, not the web.
 *
 * Auth: a one-time OAuth setup gives you a refresh token; we mint short-lived
 * access tokens from it on each run. Env vars (see .env.example):
 *   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
 *
 * Videos upload as PRIVATE by default — nothing goes public by accident. Flip
 * `privacyStatus` to "public" (or schedule) only when you're ready.
 */
import fs from "fs";
import { Readable } from "stream";

export type PublishInput = {
  filePath: string;
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: "private" | "unlisted" | "public";
  /** YouTube category 27 = Education, 28 = Science & Tech. */
  categoryId?: string;
};

export function isYouTubeConfigured(creds?: { clientId?: string; clientSecret?: string; refreshToken?: string }): boolean {
  return Boolean(
    (creds?.clientId ?? process.env.YOUTUBE_CLIENT_ID) &&
      (creds?.clientSecret ?? process.env.YOUTUBE_CLIENT_SECRET) &&
      (creds?.refreshToken ?? process.env.YOUTUBE_REFRESH_TOKEN)
  );
}

/** Per-channel credential override; falls back to base env vars. */
export type YtCreds = { clientId?: string; clientSecret?: string; refreshToken?: string };

async function accessToken(creds?: YtCreds): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds?.clientId ?? process.env.YOUTUBE_CLIENT_ID!,
      client_secret: creds?.clientSecret ?? process.env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: creds?.refreshToken ?? process.env.YOUTUBE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token as string;
}

/** Upload a rendered piece. Returns the YouTube video id. */
export async function publishToYouTube(input: PublishInput, creds?: YtCreds): Promise<string> {
  if (!isYouTubeConfigured(creds)) throw new Error("YouTube not configured — set YOUTUBE_CLIENT_ID/SECRET + a channel refresh token");
  if (!fs.existsSync(input.filePath)) throw new Error(`file not found: ${input.filePath}`);

  const token = await accessToken(creds);
  const size = fs.statSync(input.filePath).size;
  const meta = {
    snippet: {
      title: input.title.slice(0, 100),
      description: input.description.slice(0, 4900),
      tags: input.tags?.slice(0, 30),
      categoryId: input.categoryId || "27",
    },
    status: { privacyStatus: input.privacyStatus || "private", selfDeclaredMadeForKids: false },
  };

  // 1. start a resumable session
  const start = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(size),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(meta),
    }
  );
  if (!start.ok) throw new Error(`resumable init failed: ${start.status} ${await start.text()}`);
  const uploadUrl = start.headers.get("location");
  if (!uploadUrl) throw new Error("no resumable upload URL returned");

  // 2. stream the bytes (no full-file buffer in memory)
  const body = Readable.toWeb(fs.createReadStream(input.filePath)) as ReadableStream;
  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(size) },
    body,
    // @ts-expect-error Node fetch requires duplex for streaming bodies
    duplex: "half",
  });
  if (!put.ok) throw new Error(`upload failed: ${put.status} ${await put.text()}`);
  const video = await put.json();
  return video.id as string;
}

/**
 * Set a custom thumbnail (≤2MB jpg/png). Authorized by the existing
 * youtube.upload scope; costs 50 Data API units. Note: the Shorts feed never
 * shows custom thumbnails, but search/channel-page surfaces do.
 */
export async function setThumbnail(videoId: string, imagePath: string, creds?: YtCreds): Promise<void> {
  const token = await accessToken(creds);
  const bytes = fs.readFileSync(imagePath);
  if (bytes.length > 2 * 1024 * 1024) throw new Error("thumbnail exceeds 2MB");
  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg" }, body: new Uint8Array(bytes) }
  );
  if (!res.ok) throw new Error(`thumbnail set failed: ${res.status} ${await res.text()}`);
}

export type YouTubeChannelStats = {
  title: string;
  subscribers: number;
  views: number; // lifetime public views
  videoCount: number;
};

/**
 * Channel-level headline stats — the numerator for YouTube Partner Program
 * milestones (1,000 subscribers + 10M public Shorts views / 90d).
 *
 * Prefers the Data API channels.list (exact subscriber + lifetime view count)
 * when the token carries youtube.readonly. Our publish tokens only carry
 * youtube.upload + yt-analytics.readonly, so it falls back to the Analytics API:
 * lifetime `views` and NET subscribers (subscribersGained − subscribersLost over
 * the channel's life) — which equals the current count for a channel that
 * started near zero. Returns null only if neither source is reachable.
 */
export async function fetchChannelStats(creds?: YtCreds): Promise<YouTubeChannelStats | null> {
  if (!isYouTubeConfigured(creds)) return null;
  let token: string;
  try { token = await accessToken(creds); } catch { return null; }

  // 1. Data API (exact) — only works if the token has youtube(.readonly).
  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = (await res.json()) as { items?: Array<{ snippet?: { title?: string }; statistics?: Record<string, string> }> };
      const it = data.items?.[0];
      if (it?.statistics) {
        return {
          title: it.snippet?.title || "",
          subscribers: Number(it.statistics.subscriberCount) || 0,
          views: Number(it.statistics.viewCount) || 0,
          videoCount: Number(it.statistics.videoCount) || 0,
        };
      }
    }
  } catch { /* fall through to Analytics */ }

  // 2. Analytics API (proxy) — works with yt-analytics.readonly.
  try {
    const params = new URLSearchParams({
      ids: "channel==MINE", startDate: "2005-02-14", // YouTube's launch — covers any channel's life
      endDate: new Date().toISOString().slice(0, 10),
      metrics: "views,subscribersGained,subscribersLost",
    });
    const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { columnHeaders?: Array<{ name: string }>; rows?: Array<Array<number>> };
    const cols = (data.columnHeaders || []).map((c) => c.name);
    const row = data.rows?.[0];
    if (!row) return null;
    const get = (n: string) => Number(row[cols.indexOf(n)]) || 0;
    return {
      title: "",
      subscribers: Math.max(0, get("subscribersGained") - get("subscribersLost")),
      views: get("views"),
      videoCount: 0,
    };
  } catch {
    return null;
  }
}

export type YouTubeVideoStats = {
  videoId: string;
  views: number;
  engagedViews: number; // use this for Shorts (views counts every replay since 2025-06)
  watchTimeSec: number;
  avgViewDurSec: number;
  avgViewPct: number;
  subscribersGained: number;
  likes: number;
  comments: number;
  impressions: number;
  ctr: number;
};

/**
 * Per-video performance via the YouTube Analytics API (needs the refresh token
 * re-minted with BOTH scopes: youtube.upload + yt-analytics.readonly), merged
 * with near-real-time public stats from the Data API (Analytics lags ~48-72h).
 */
export async function fetchVideoStats(videoIds: string[], opts?: { startDate?: string; endDate?: string }, creds?: YtCreds): Promise<YouTubeVideoStats[]> {
  if (!videoIds.length) return [];
  const token = await accessToken(creds);
  const end = opts?.endDate || new Date().toISOString().slice(0, 10);
  const start = opts?.startDate || new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10);
  const byId = new Map<string, YouTubeVideoStats>(
    videoIds.map((id) => [id, { videoId: id, views: 0, engagedViews: 0, watchTimeSec: 0, avgViewDurSec: 0, avgViewPct: 0, subscribersGained: 0, likes: 0, comments: 0, impressions: 0, ctr: 0 }])
  );

  // 1. Analytics API — authoritative engagement metrics (may 403 if the token
  //    lacks yt-analytics.readonly; degrade to public stats only).
  try {
    const params = new URLSearchParams({
      ids: "channel==MINE", startDate: start, endDate: end,
      metrics: "views,engagedViews,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained",
      dimensions: "video", filters: `video==${videoIds.slice(0, 500).join(",")}`,
      maxResults: "200", sort: "-views",
    });
    const res = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { columnHeaders?: Array<{ name: string }>; rows?: Array<Array<string | number>> };
      const cols = (data.columnHeaders || []).map((c) => c.name);
      for (const row of data.rows || []) {
        const rec = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
        const s = byId.get(String(rec.video));
        if (!s) continue;
        s.views = Number(rec.views) || 0;
        s.engagedViews = Number(rec.engagedViews) || 0;
        s.watchTimeSec = Math.round((Number(rec.estimatedMinutesWatched) || 0) * 60);
        s.avgViewDurSec = Number(rec.averageViewDuration) || 0;
        s.avgViewPct = Number(rec.averageViewPercentage) || 0;
        s.subscribersGained = Number(rec.subscribersGained) || 0;
      }
    }
  } catch { /* analytics scope missing — public stats below still work */ }

  // 2. Data API public stats — fresh likes/comments and a floor for views.
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds.slice(0, 50).join(",")}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = (await res.json()) as { items?: Array<{ id: string; statistics?: Record<string, string> }> };
      for (const item of data.items || []) {
        const s = byId.get(item.id);
        if (!s || !item.statistics) continue;
        s.views = Math.max(s.views, Number(item.statistics.viewCount) || 0);
        s.likes = Number(item.statistics.likeCount) || 0;
        s.comments = Number(item.statistics.commentCount) || 0;
      }
    }
  } catch { /* non-fatal */ }

  return [...byId.values()];
}
