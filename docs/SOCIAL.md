# Social Media pillar

Create short-form video content and publish it to **YouTube** and **Instagram**
from the dashboard (`/social`). Ported from the LeadFlow content studio and
rebuilt to match CIBA's conventions: filesystem JSON store, mock-first, provider
seams, server-actions for mutations + API routes for long jobs.

## Flow

1. **Compose** (`features/social/post-composer.tsx`) — pick a channel, describe
   the video, choose format (short / long), platforms, and privacy. Optionally
   upload a finished MP4.
2. **Copy** (`lib/social/copy.ts`) — title, description, caption, and hashtags
   are generated. Mock mode uses a deterministic template (no keys); real mode
   uses CIBA's Gemini provider. Every field is run through `stripEmDashes`, and
   the prompt forbids mentioning AI (house rules).
3. **Media** — if you uploaded a file, it is used as-is. Otherwise a render is
   queued via the render seam (`lib/social/render.ts`). Mock produces the bundled
   sample MP4 (zero keys); real mode drives the ported engine (`lib/social/engine.mjs`):
   Edge-TTS voiceover → Pexels stock footage → ffmpeg render with karaoke
   captions, a brand end-card, thumbnail, and sidecar SRT. Narration is
   creator-written (composer field), or a template, or Gemini when a key is set.
4. **Publish** (`app/api/social/publish/route.ts`) — pushes to each platform one
   at a time, saving each target's status incrementally so one platform failing
   never loses another's success. YouTube uploads the file directly (resumable);
   Instagram pulls the reel from a public URL (see CDN below).

## Files

| Area | Path |
|---|---|
| Ported publish modules (verbatim) | `lib/social/instagram.ts`, `lib/social/youtube.ts` |
| Ported render engine + fonts | `lib/social/engine.mjs`, `assets/fonts/` |
| Channel registry + creds + b-roll queries | `lib/social/channels.ts` |
| Copy generation (+ mock) | `lib/social/copy.ts`, `lib/ai/prompts/social.ts` |
| Narration builder (creator / template / Gemini) | `lib/social/script.ts` |
| Render seam (mock sample / real engine) | `lib/social/render.ts` |
| Publish seam (mock / real IG+YT + CDN mirror) | `lib/social/publish.ts` |
| Analytics (channel + per-post stats) | `lib/social/stats.ts` |
| Types | `types/social.ts` |
| Store (JSON) | `features/social/data.ts` → `data/social/posts.json` |
| Server actions | `features/social/actions.ts` |
| API routes | `app/api/social/{render,publish,stats,posts/[id],posts/[id]/insights}/route.ts` |
| UI | `app/social/page.tsx`, `features/social/{social-view,post-composer,post-card,channel-stats,use-posts}.tsx` |

## Modes

Three independent switches (`lib/config.ts`), each defaulting to follow `MOCK_AI`:

- **`MOCK_AI`** (default `true`) — governs copy + narration. Template text, no keys.
- **`MOCK_RENDER`** — governs media rendering. `false` runs the real ffmpeg/TTS/
  Pexels engine (needs `PEXELS_API_KEY`); mock copies the sample MP4.
- **`MOCK_PUBLISH`** — governs publishing. `false` publishes to **real accounts**.

Because they're independent, the practical combo with no Gemini key is:
`MOCK_AI=true` (template copy + creator-written narration) + `MOCK_RENDER=false`
(render real videos) + `MOCK_PUBLISH=false` (publish for real). Or keep
`MOCK_RENDER=true` and **upload your own finished MP4** to publish.

Analytics (channel stats, per-post insights) follow `MOCK_PUBLISH` and are
loaded **on demand** (buttons), never polled, per the "no polling of paid APIs"
rule.

> Publishing a post is outward-facing and hard to reverse. Keep `MOCK_PUBLISH=true`
> until you intend to post to the live accounts.

## Credentials (env)

Per-channel creds resolve by prefix (`channels.ts`): base vars, or
`YT_<PREFIX>_REFRESH_TOKEN` / `IG_<PREFIX>_USER_ID` / `IG_<PREFIX>_ACCESS_TOKEN`.
The Google OAuth client (`YOUTUBE_CLIENT_ID` / `_SECRET`) is shared.

- **YouTube:** `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and a refresh token
  (`YT_SPEEDMANIA_REFRESH_TOKEN`, `YT_GOALMANIA_REFRESH_TOKEN`, …). Scopes:
  `youtube.upload` + `yt-analytics.readonly`.
- **Instagram:** `IG_<PREFIX>_USER_ID` + `IG_<PREFIX>_ACCESS_TOKEN` (long-lived).
- **Instagram public URL:** Meta downloads the reel from a public https URL.
  Either `CONTENT_CDN_REPO` (a GitHub repo — uploads the mp4 to a Release via the
  `gh` CLI, free) or `VIDEO_PUBLIC_BASE_URL` (a bucket serving `data/social/`).

The demo `.env.local` was seeded from LeadFlow: Speed Mania and Goal Mania have
full YouTube + Instagram credentials and a GitHub CDN.

## Status

- **Phase 1 — publish path.** Done. Compose → copy → media → publish to YouTube
  (direct upload) + Instagram (public-URL Reel). Verified end-to-end in mock mode.
- **Phase 2 — real render engine.** Done. `engine.mjs` ported (deps `ffmpeg-static`
  + `msedge-tts`; Anton font in `assets/fonts/`). Verified: a real 1080×1920
  H.264 + AAC Short renders in ~35s from a short script.
- **Phase 3 — analytics.** Done. `getAllChannelStats` + `getPostInsights`
  (`lib/social/stats.ts`) wrap the ported `fetchChannelStats` / `fetchVideoStats` /
  `fetchReelInsights`, surfaced as the channel-performance strip and per-post
  Stats button.

## Possible next steps (not built)

- **Scheduling** — a queued-publish time per post + a cron worker; the store and
  publish route already support the state machine.
- **fal.ai hero clips / virtual-influencer persona** — LeadFlow's `aivideo.mjs`
  and `personagen.mjs` can plug in behind the render seam (needs `FAL_KEY`).
- **TikTok** — LeadFlow's `tiktok.ts` mirrors the IG pattern; add it as a third
  target if wanted.
