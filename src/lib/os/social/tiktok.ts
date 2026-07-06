/**
 * TikTok publishing via the Content Posting API (Direct Post, PULL_FROM_URL) —
 * same shape as instagram.ts: TikTok's servers pull a PUBLIC video URL, then we
 * poll until the post completes. Dependency-free.
 *
 * Flow:
 *   1. POST /v2/post/publish/video/init/  { post_info, source_info: PULL_FROM_URL }
 *      → { data: { publish_id } }
 *   2. poll /v2/post/publish/status/fetch/ { publish_id } until PUBLISH_COMPLETE
 *
 * Notes / gotchas:
 *  - The video_url host must be a domain you've verified in the TikTok dev portal
 *    (the same VIDEO_PUBLIC_BASE_URL bucket).
 *  - Unaudited apps can ONLY post as SELF_ONLY (private). Once your app is
 *    approved, set TIKTOK_PRIVACY=PUBLIC_TO_EVERYONE. We default to SELF_ONLY so
 *    a fresh app doesn't error.
 *
 * Env: TIKTOK_ACCESS_TOKEN (or TIKTOK_PERSONA_ACCESS_TOKEN per channel),
 *      optional TIKTOK_PRIVACY.
 */

const API = "https://open.tiktokapis.com/v2";

export type TtCreds = { accessToken?: string };
const tok = (c?: TtCreds) => c?.accessToken ?? process.env.TIKTOK_ACCESS_TOKEN;

export function isTikTokConfigured(creds?: TtCreds): boolean {
  return Boolean(tok(creds));
}

/** Resolve per-channel TikTok creds (TIKTOK_<PREFIX>_ACCESS_TOKEN, base fallback). */
export function tiktokCreds(envPrefix: string): TtCreds {
  const p = envPrefix ? `${envPrefix}_` : "";
  return { accessToken: process.env[`TIKTOK_${p}ACCESS_TOKEN`] || process.env.TIKTOK_ACCESS_TOKEN };
}

async function tt(path: string, body: unknown, creds?: TtCreds): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok(creds)}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const err = (json.error as { code?: string; message?: string }) || {};
  if (!res.ok || (err.code && err.code !== "ok")) {
    throw new Error(`TikTok ${path} → ${res.status}: ${err.message || JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

export type PublishTikTokInput = {
  /** PUBLIC https URL of the mp4 (host must be verified in the TikTok dev portal). */
  videoUrl: string;
  /** Caption / title (hashtags allowed). */
  title: string;
  /** Override the default privacy (defaults to env TIKTOK_PRIVACY or SELF_ONLY). */
  privacy?: string;
};

/** Publish a video to TikTok. Returns the publish_id (persist for status checks). */
export async function publishTikTok(input: PublishTikTokInput, creds?: TtCreds): Promise<string> {
  if (!isTikTokConfigured(creds)) throw new Error("TikTok not configured — set TIKTOK_ACCESS_TOKEN");

  const privacy = input.privacy || process.env.TIKTOK_PRIVACY || "SELF_ONLY";
  const init = await tt(
    "/post/publish/video/init/",
    {
      post_info: { title: input.title.slice(0, 2200), privacy_level: privacy, disable_comment: false },
      source_info: { source: "PULL_FROM_URL", video_url: input.videoUrl },
    },
    creds,
  );
  const publishId = (init.data as { publish_id?: string })?.publish_id;
  if (!publishId) throw new Error(`TikTok init returned no publish_id: ${JSON.stringify(init).slice(0, 200)}`);

  // Poll until the post is live (or fails). PULL_FROM_URL processing is async.
  const deadline = Date.now() + 10 * 60 * 1000;
  for (;;) {
    const st = await tt("/post/publish/status/fetch/", { publish_id: publishId }, creds);
    const status = (st.data as { status?: string })?.status;
    if (status === "PUBLISH_COMPLETE") break;
    if (status === "FAILED")
      throw new Error(`TikTok publish FAILED: ${JSON.stringify((st.data as object) || st).slice(0, 300)}`);
    if (Date.now() > deadline) throw new Error("TikTok publish timed out (10min)");
    await new Promise((r) => setTimeout(r, 20_000));
  }
  return publishId;
}
