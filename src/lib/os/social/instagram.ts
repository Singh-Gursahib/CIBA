/**
 * Instagram Reels publishing + insights — "Instagram API with Instagram Login"
 * variant (graph.instagram.com): no linked Facebook Page needed, dependency-free.
 *
 * Publishing is a 3-step dance: create a media container pointing at a PUBLIC
 * video URL (Meta's servers download it) → poll until processed → publish.
 * The rendered MP4 must therefore be uploaded somewhere public first — set
 * VIDEO_PUBLIC_BASE_URL to the bucket/CDN base where content-out/ files are
 * mirrored (R2/S3/Vercel Blob). Our renders already satisfy the Reels specs:
 * 1080x1920 H.264 yuv420p + AAC + faststart, ≤15min, ≤300MB.
 *
 * Env (see .env.example): IG_USER_ID, IG_ACCESS_TOKEN (long-lived, 60-day —
 * refresh weekly via refreshIgToken), optional IG_GRAPH_BASE to pin a version.
 */

const BASE = () => process.env.IG_GRAPH_BASE || "https://graph.instagram.com/v25.0";

/** Per-channel credential override; falls back to base env vars. */
export type IgCreds = { userId?: string; accessToken?: string };
const uid = (c?: IgCreds) => c?.userId ?? process.env.IG_USER_ID;
const tok = (c?: IgCreds) => c?.accessToken ?? process.env.IG_ACCESS_TOKEN;

export function isInstagramConfigured(creds?: IgCreds): boolean {
  return Boolean(uid(creds) && tok(creds));
}

async function ig(path: string, init?: RequestInit, creds?: IgCreds): Promise<Record<string, unknown>> {
  const url = `${BASE()}${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(tok(creds)!)}`;
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (body as { error?: { message?: string } }).error;
    throw new Error(`IG ${path} → ${res.status}: ${err?.message || JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
}

export type PublishReelInput = {
  /** PUBLIC https URL of the rendered mp4 (Meta downloads it). */
  videoUrl: string;
  /** Caption ≤2200 chars — hashtags + the CTA link note live here. */
  caption: string;
  /** Optional public cover image URL (mutually exclusive with thumbOffsetMs). */
  coverUrl?: string;
  thumbOffsetMs?: number;
  shareToFeed?: boolean;
};

/** Publish a Reel. Returns the IG media id (persist for insights polling). */
export async function publishReel(input: PublishReelInput, creds?: IgCreds): Promise<string> {
  if (!isInstagramConfigured(creds)) throw new Error("Instagram not configured — set IG_USER_ID / IG_ACCESS_TOKEN");
  const userId = uid(creds)!;

  const params = new URLSearchParams({
    media_type: "REELS",
    video_url: input.videoUrl,
    caption: input.caption.slice(0, 2200),
    share_to_feed: String(input.shareToFeed ?? true),
  });
  if (input.coverUrl) params.set("cover_url", input.coverUrl);
  else if (input.thumbOffsetMs != null) params.set("thumb_offset", String(input.thumbOffsetMs));

  const container = await ig(`/${userId}/media?${params}`, { method: "POST" }, creds);
  const containerId = container.id as string;

  // Poll processing — Reels usually finish in 30s–2min; hard timeout 10min.
  const deadline = Date.now() + 10 * 60 * 1000;
  for (;;) {
    const st = await ig(`/${containerId}?fields=status_code,status`, undefined, creds);
    const code = st.status_code as string;
    if (code === "FINISHED") break;
    if (code === "ERROR" || code === "EXPIRED")
      throw new Error(`IG container ${code}: ${JSON.stringify(st.status).slice(0, 300)}`);
    if (Date.now() > deadline) throw new Error("IG container processing timed out (10min)");
    await new Promise((r) => setTimeout(r, 30_000));
  }

  const pub = await ig(`/${userId}/media_publish?creation_id=${containerId}`, { method: "POST" }, creds);
  return pub.id as string;
}

export type PublishPhotoInput = {
  /** PUBLIC https URL(s) of the image(s). 1 = single photo; 2-10 = carousel. */
  imageUrls: string[];
  /** Caption ≤2200 chars. */
  caption: string;
};

/**
 * Publish a single photo or a carousel (the influencer's bread-and-butter feed
 * post). Single image → one container → publish. Multiple → child containers
 * (is_carousel_item) → a CAROUSEL parent → publish. Returns the IG media id.
 */
export async function publishPhoto(input: PublishPhotoInput, creds?: IgCreds): Promise<string> {
  if (!isInstagramConfigured(creds)) throw new Error("Instagram not configured — set IG_USER_ID / IG_ACCESS_TOKEN");
  const userId = uid(creds)!;
  const urls = input.imageUrls.slice(0, 10);
  if (urls.length === 0) throw new Error("publishPhoto: no image URLs");
  const caption = input.caption.slice(0, 2200);

  let creationId: string;
  if (urls.length === 1) {
    const c = await ig(`/${userId}/media?${new URLSearchParams({ image_url: urls[0], caption })}`, { method: "POST" }, creds);
    creationId = c.id as string;
  } else {
    const children: string[] = [];
    for (const u of urls) {
      const c = await ig(`/${userId}/media?${new URLSearchParams({ image_url: u, is_carousel_item: "true" })}`, { method: "POST" }, creds);
      children.push(c.id as string);
    }
    const parent = await ig(
      `/${userId}/media?${new URLSearchParams({ media_type: "CAROUSEL", children: children.join(","), caption })}`,
      { method: "POST" },
      creds,
    );
    creationId = parent.id as string;
  }

  const pub = await ig(`/${userId}/media_publish?creation_id=${creationId}`, { method: "POST" }, creds);
  return pub.id as string;
}

export type ReelInsights = {
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
};

/** Lifetime insights for a published Reel. */
export async function fetchReelInsights(mediaId: string, creds?: IgCreds): Promise<ReelInsights> {
  const body = await ig(`/${mediaId}/insights?metric=views,reach,likes,comments,shares,saved&period=lifetime`, undefined, creds);
  const out: ReelInsights = { views: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
  for (const m of (body.data as Array<{ name: string; values?: Array<{ value?: number }> }>) || []) {
    const v = m.values?.[0]?.value ?? 0;
    if (m.name === "views") out.views = v;
    else if (m.name === "reach") out.reach = v;
    else if (m.name === "likes") out.likes = v;
    else if (m.name === "comments") out.comments = v;
    else if (m.name === "shares") out.shares = v;
    else if (m.name === "saved") out.saves = v;
  }
  return out;
}

/**
 * Refresh the long-lived token (60-day expiry — run weekly from cron; an
 * expired token can only be re-minted from the Meta app dashboard).
 * Returns the new token; caller must persist it into the environment.
 */
export async function refreshIgToken(): Promise<string> {
  const res = await fetch(
    `${BASE()}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(process.env.IG_ACCESS_TOKEN!)}`
  );
  const body = (await res.json()) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !body.access_token) throw new Error(`IG token refresh failed: ${body.error?.message || res.status}`);
  return body.access_token;
}
