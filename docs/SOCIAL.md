# Social Studio (`/os/social`)

A role-scoped content studio inside CIBA OS: create short-form video, render it
(voiceover + stock footage + ffmpeg, or upload your own), and publish it to
**YouTube** and **Instagram** — with per-post and channel analytics. It upgrades
the old mock "Social Scheduler" connector into a real publishing pipeline.

Ported and adapted from the Embertide / LeadFlow content engine, rebuilt to
match CIBA OS's conventions: filesystem persistence, cookie-scoped permissions,
route handlers (no server actions), the demo-mode-first pattern, and the OS
design system.

## Who can use it

Gated to the **Marketing Coordinator** (Jake) and the **Executive Director**
(Sachin). Everyone else sees a "scoped to Marketing" notice — enforced in every
API route (`canOperateSocial`), not just the UI. Executives see all members'
posts; others see their own.

## Flow

1. **Compose** — pick a channel (Speed Mania / Goal Mania / Embertide), optionally
   link a collaboration, describe the video (and optionally write the narration),
   choose format + platforms + privacy, or upload a finished MP4.
2. **Copy** — title / description / caption / hashtags are generated (template in
   demo mode; Claude when `ANTHROPIC_API_KEY` is set). Em dashes stripped.
3. **Render** — `renderMedia()`: demo copies a sample clip; real mode drives the
   engine (Edge-TTS voiceover → Pexels footage → ffmpeg with captions + end-card).
4. **Publish** — one platform at a time, saving each result incrementally.
   YouTube uploads directly; Instagram pulls a Reel from a public URL.
5. **Analytics** — channel stats + per-post insights, on demand (never polled).

## Modes (`src/lib/os/social/config.ts`)

Three independent switches so each external stage can be real or simulated:
`MOCK_AI` (copy), `MOCK_RENDER` (media), `MOCK_PUBLISH` (posting). All default to
demo, so the studio runs with zero keys. Set any to `false` to go live on that
stage. See `.env.example`.

## Where it plugs into the OS

- **Nav + page:** `/os/social` (`src/app/os/social/`), gated in the page.
- **Persistence:** `.data/social-posts.json` (`src/lib/os/social/store.ts`) +
  rendered media under `.data/social/outputs/` (served by `/api/os/social/media`).
  Seed arrays are immutable, so real posts live here — like `connectors/tokens.ts`.
- **Integrations page:** live YouTube + Instagram connectors show real
  env-config status; the `int-buffer` seed entry became "Social Studio".
- **Project workspaces:** the "📣 Social & outreach" card lists Studio videos
  linked to that collaboration.
- **AI assistant:** `scopedContext()` and the demo answers surface the member's
  Studio posts — automatically permission-scoped.

## Files

| Area | Path |
|---|---|
| Engine + publish (ported) | `src/lib/os/social/{engine.mjs,youtube.ts,instagram.ts,channels.ts}` |
| Config / store / access / types | `src/lib/os/social/{config,store,access,types}.ts` |
| Copy / narration (Claude-or-template) | `src/lib/os/social/{copy,script}.ts` |
| Render / publish / stats seams | `src/lib/os/social/{render,publish,stats}.ts` |
| API | `src/app/api/os/social/{create,render,publish,stats,posts,posts/[id],posts/[id]/insights,media/[...path]}` |
| UI | `src/app/os/social/{page.tsx,studio.tsx}` |
| Deps | `ffmpeg-static`, `msedge-tts`; caption font in `assets/fonts/` |
