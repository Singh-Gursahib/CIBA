# CIBA AI Pipeline — Implementation Plan

**Project:** AI workflow platform for CIBA (Central Interior Business Accelerator), Kamloops BC, affiliated with Thompson Rivers University (TRU).
**Primary user:** Sachin (CIBA staff). Single-user internal tool, no auth required for v1.
**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS v4 · lucide-react · zustand · d3-force · react-markdown · Tiptap · OpenAI gpt-image-1 · Gemini 3.5 Flash (`@google/genai`)
**Architecture reference:** `~/Documents/MyProjects/FirstResponders/resilience-os` (feature folders, custom d3-force canvas graph, Gemini function-calling agent loop with NDJSON streaming). We replicate its proven patterns, adapted to filesystem storage instead of Supabase.
**Design reference:** Anthropic frontend-design skill. Light theme, Apple-grade polish, one signature element per surface, restraint everywhere else.

---

## Table of Contents

- [Phase 0 — Global Decisions (read first)](#phase-0--global-decisions)
- [Phase 1 — Foundation, Design System & App Shell](#phase-1--foundation-design-system--app-shell)
- [Phase 2 — Marketing Studio (Images + Video Placeholder)](#phase-2--marketing-studio)
- [Phase 3 — Knowledge OS (Docs, Graph, AI Assistant)](#phase-3--knowledge-os)
- [Phase 4 — Grant Discovery Agent & Proposal Generation](#phase-4--grant-discovery-agent--proposal-generation)
- [Phase 5 — Proposal Editor, Export & Final Polish](#phase-5--proposal-editor-export--final-polish)
- [Appendix A — What I need from the user](#appendix-a--what-i-need-from-the-user)
- [Appendix B — Cost-conservation rules](#appendix-b--cost-conservation-rules)
- [Appendix C — QA checklist per phase](#appendix-c--qa-checklist)

---

## Phase 0 — Global Decisions

These decisions apply to every phase. They are settled unless the user overrides them.

### 0.1 Storage: filesystem, not a database

Single user, local-first tool. Everything persists to disk inside the repo:

```
ciba-os/                        # the Next.js app
├── content/
│   └── knowledge/              # 18–20 wiki markdown docs (Phase 3)
│       ├── projects/
│       ├── grants/
│       ├── meetings/
│       ├── partnerships/
│       ├── programs/
│       └── org/
├── brand/
│   ├── ciba-logo.png           # provided by user
│   ├── tru-logo.png            # provided by user
│   └── brand.md                # written brand/design-language description → fed into system prompts
├── data/                       # runtime state (gitignored except .gitkeep)
│   ├── marketing/
│   │   ├── jobs.json           # image/video generation job records
│   │   └── uploads/            # user-uploaded source assets
│   ├── grants/
│   │   ├── organizations.json  # registry of 5–6 funding orgs to monitor
│   │   ├── discoveries.json    # every grant opportunity ever seen (dedup source of truth)
│   │   └── activity-log.json   # timestamped log of every scan
│   └── proposals/
│       └── <slug>/
│           ├── proposal.md     # current document
│           ├── meta.json       # title, grant ref, status, timestamps
│           ├── answers.json    # Q&A responses
│           └── versions/       # timestamped snapshots
└── public/
    └── generated/              # generated marketing images (served statically)
```

Rationale: no DB setup, no credentials, markdown files satisfy the "store knowledge in markdown" requirement, and `data/` JSON files are trivially inspectable/debuggable. Supabase can be swapped in later behind the same `lib/store/` interface if multi-user is ever needed.

### 0.2 AI providers and models

| Capability | Provider / model | Why |
|---|---|---|
| Marketing image generation | OpenAI `gpt-image-1` via `images.edit` (multi-image input) | User-specified ("ChatGPT image API"). `images.edit` accepts up to 16 input images, so uploaded assets + both logos go in as references. |
| Grant discovery (web search) | Gemini `gemini-3.5-flash` with `google_search` tool | User-specified. Confirmed in docs: 3.5 Flash supports Google Search grounding and can combine it with function calling. SDK: `@google/genai`. |
| Fit analysis, clarifying questions, proposal generation | Gemini `gemini-3.5-flash` (upgradeable to a Pro model via env var) | One text-AI key for the whole app keeps setup and cost minimal. `GEMINI_TEXT_MODEL` env var controls it. |
| Knowledge assistant (tool-calling doc search) | Gemini `gemini-3.5-flash`, custom function calling | Mirrors FirstResponders `lib/ai/agent.ts` loop exactly. |
| Video generation | Stub provider interface | User will supply the pipeline later. |

Env vars (in `.env.local`, template committed as `.env.example`):

```
OPENAI_API_KEY=
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=gemini-3.5-flash
IMAGE_QUALITY=low            # low during dev, high for real runs
MOCK_AI=false                # true → all AI routes return canned fixtures, zero API cost
```

### 0.3 Shared AI infrastructure (`lib/ai/`)

Ported from FirstResponders and generalized:

- `lib/ai/gemini.ts` — thin client over `@google/genai` (`generateContent` with system prompt, contents, tools, optional `google_search`). Retry: 3 attempts, exponential backoff on 429/5xx.
- `lib/ai/agent.ts` — the function-calling loop: call model → if `functionCall` parts, execute via injected `exec`, push `functionResponse`, repeat (maxSteps ~8) → when plain text arrives, stream it out via `emit`.
- `lib/ai/stream.ts` — NDJSON `ReadableStream` helper. Event types: `tool_start`, `tool_end`, `text` (delta), `done`, `error`. All chat-like routes return `application/x-ndjson`.
- `lib/ai/openai-images.ts` — wrapper for `images.edit` / `images.generate` with size mapping and mock mode.
- `lib/ai/mock.ts` — fixture responses used when `MOCK_AI=true` (placeholder gradient images, canned agent transcripts). Every AI route checks this first.

Client-side: one shared `useNdjsonStream()` hook that reads the stream and dispatches events (copied from FirstResponders `assistant-view.tsx` reader loop).

### 0.4 File organization (mirrors FirstResponders)

```
ciba-os/
├── app/
│   ├── layout.tsx / globals.css / page.tsx        # root layout, tokens, dashboard
│   ├── marketing/page.tsx
│   ├── grants/page.tsx
│   ├── grants/proposals/[slug]/page.tsx
│   ├── knowledge/page.tsx                          # graph
│   ├── knowledge/docs/[...slug]/page.tsx           # doc viewer (also opened as panel)
│   ├── assistant/page.tsx
│   └── api/
│       ├── marketing/generate/route.ts
│       ├── marketing/video/route.ts
│       ├── grants/scan/route.ts
│       ├── proposals/questions/route.ts
│       ├── proposals/generate/route.ts
│       ├── proposals/rewrite/route.ts
│       ├── proposals/export/pdf/route.ts
│       ├── proposals/export/docx/route.ts
│       └── assistant/route.ts
├── features/
│   ├── dashboard/
│   ├── marketing/
│   ├── grants/
│   ├── proposals/        # editor lives here
│   ├── knowledge/        # graph + doc viewer
│   └── assistant/
├── components/
│   ├── ui/               # Button, Card, Badge, Input, Textarea, Dialog, Tabs,
│   │                     # Tooltip, Toast, Spinner, EmptyState, Kbd, Skeleton
│   └── layout/           # Sidebar, Topbar, PageHeader, Shell
├── lib/
│   ├── ai/               # gemini.ts, agent.ts, stream.ts, openai-images.ts, mock.ts, prompts/
│   ├── content/          # markdown loader, wikilink parser, graph builder, search
│   ├── store/            # JSON file persistence helpers (read/write with locking)
│   ├── export/           # pdf.ts, docx.ts
│   └── utils/            # cn(), slugify(), dates
├── types/                # shared TS types (GraphNode, Discovery, Proposal, Job…)
├── brand/  content/  data/  public/
```

Conventions: server components fetch data and pass to client components; mutations via server actions where possible, API routes only for streaming/AI/binary; zustand only for UI state (graph filters, editor panels); every feature folder co-locates its data loader, components, and types.

### 0.5 Design direction (from the frontend-design skill)

- **Theme:** light. Paper-warm background, high-contrast ink text, generous whitespace. Apple-like restraint: hairline borders, soft shadows, 8pt spacing grid, large calm headings.
- **Provisional palette** (named tokens; refined in Phase 1.5 once real logos arrive):
  - `--color-paper: #FAF9F7` (app background), `--color-surface: #FFFFFF`
  - `--color-ink: #16181D` (primary text), `--color-ink-soft: #5A6070`, `--color-ink-faint: #9AA0AE`
  - `--color-line: #E8E6E1` (hairline borders), `--color-line-strong: #D6D3CC`
  - `--color-river: #14655F` (primary accent — Thompson River teal; CTA, active nav, links)
  - `--color-amber: #C97B22` (warm secondary — highlights, "new" badges)
  - `--color-clay: #B4552D` (sparing tertiary — destructive/alerts lean red-clay, not pure red)
- **Typography:** display **Instrument Serif** (hero moments, page titles, proposal preview) + UI/body **Instrument Sans** (everything else) + mono **IBM Plex Mono** (logs, metadata, timestamps). Loaded via `next/font`. Tight tracking on large sizes, 1.6 line-height body.
- **Icons:** lucide-react, 1.5px stroke, consistently 16/18/20px.
- **Signature element:** the knowledge graph is the visual centerpiece of the app; the dashboard carries a quiet live miniature of it. Everything else stays disciplined.
- **Motion:** 150–250ms ease-out transitions; one orchestrated entrance per page (stagger fade-up of content blocks); `prefers-reduced-motion` respected globally. No scattered micro-animations.
- **Copy:** sentence case, active voice, buttons state outcomes ("Generate posters", not "Submit"). Errors explain and offer the fix. Empty states invite the first action.

### 0.6 Definition of done (every phase)

- `npm run build` and `npm run typecheck` pass clean.
- Feature works end-to-end with `MOCK_AI=true` (no key needed) and with real keys.
- Responsive from 1024px down to 768px (desktop-first internal tool; no mobile requirement, but nothing breaks).
- Keyboard focus visible, reduced motion respected.
- `MEMORY.md` updated: phase status, what was built, next step.

---

## Phase 1 — Foundation, Design System & App Shell

Goal: a running, beautiful, empty app — navigation shell, design tokens, component library, dashboard skeleton, branding plumbing. Everything later phases build on.

### 1.1 Scaffold the project

- `npx create-next-app@latest ciba-os` — TypeScript, ESLint, Tailwind, App Router, `src` dir **off** (match FirstResponders layout), import alias `@/*`.
- Install: `lucide-react zustand clsx tailwind-merge d3-force react-markdown remark-gfm fuse.js gray-matter @google/genai openai motion`
- Dev deps: `@types/d3-force tsx`
- Create the full folder skeleton from 0.4 (empty index files where needed), `data/` structure with `.gitkeep`s, `.env.example`, `.gitignore` entries for `data/**` runtime files, `public/generated/`, `.env.local`.
- `lib/utils/cn.ts` (clsx + tailwind-merge), `lib/utils/slugify.ts`, `lib/utils/dates.ts` (friendly + ISO formatting, America/Vancouver).
- `README.md`: setup, env vars, scripts, folder map.

### 1.2 Design tokens & global styles

- `app/globals.css` with Tailwind v4 `@theme` block: full palette from 0.5, font variables, radii (`--radius-sm: 8px / md: 12px / lg: 16px / xl: 24px`), shadows (`--shadow-1` barely-there card shadow, `--shadow-2` popover, `--shadow-focus` accent ring), easing tokens (`--ease-out-quint`).
- `next/font` setup in `app/layout.tsx`: Instrument Serif (400 + italic), Instrument Sans (400/500/600), IBM Plex Mono (400/500). Expose as `--font-display`, `--font-sans`, `--font-mono`.
- Base styles: selection color, focus-visible ring, scrollbar styling (thin, line-colored), `prefers-reduced-motion` global override.
- `.prose-ciba` class for rendered markdown: serif headings, comfortable measure (~68ch), styled tables/blockquotes/code, wikilink pill style.

### 1.3 UI component library (`components/ui/`)

Custom, no shadcn (matches reference project). Each ≤120 lines, typed props, composable:

- `Button` — variants: primary (river, white text), secondary (surface + hairline), ghost, destructive (clay); sizes sm/md/lg; loading state with inline spinner; icon slot.
- `Card`, `CardHeader`, `CardBody` — surface, hairline border, radius-lg, shadow-1.
- `Badge` — neutral / river / amber / clay tints; used for statuses everywhere.
- `Input`, `Textarea`, `Select`, `Label`, `FieldError` — quiet borders, focus ring in river.
- `Dialog` (native `<dialog>` or headless custom, scale+fade in), `Tooltip` (delay 300ms), `Tabs`, `Switch`.
- `Toast` — bottom-right stack, auto-dismiss, success/error/info; exposed via `useToast()`.
- `Spinner`, `Skeleton` (shimmer), `EmptyState` (icon, title, one-line invitation, primary action), `Kbd`, `ProgressBar`.
- `app/styleguide/page.tsx` — internal page rendering every component in every state (dev aid, kept out of nav).

### 1.4 App shell & navigation

- `components/layout/Sidebar.tsx` — fixed left, 240px; CIBA wordmark/logo top; nav: **Dashboard** (LayoutDashboard), **Marketing Studio** (Palette), **Grants** (Landmark), **Knowledge** (Waypoints), **Assistant** (Sparkles); active item: river text + soft river tint pill; bottom: "Powered by CIBA × TRU" lockup slot + settings-ish footer.
- `components/layout/Topbar.tsx` — page title (from route), breadcrumbs for nested routes, right slot for page actions.
- `components/layout/Shell.tsx` — sidebar + scrollable main; used by root layout for all pages.
- `PageHeader` — display-serif title, one-line description, action slot; consistent 32px top rhythm on every page.
- Page-entrance animation: content blocks stagger fade-up 12px, 300ms, once per navigation (motion library, disabled under reduced motion).

### 1.5 Branding plumbing

- `brand/brand.md` — the written design-language document injected into image-generation system prompts. Structure: org identity (CIBA mission, TRU affiliation), logo usage rules (both logos present, clear space, never distorted), color palette (hexes), typography feel, photography/illustration style, tone words ("professional, optimistic, community-rooted"), layout conventions (logo placement bottom strip, generous margins). **Ships with a well-researched draft; user's real logos + corrections slot in without code changes.**
- `components/ui/Logo.tsx` — renders CIBA logo (placeholder SVG wordmark until real file arrives) and `CoBrand` lockup (CIBA × TRU) for the sidebar footer.
- `lib/ai/prompts/brand.ts` — reads `brand/brand.md` at request time and composes it into image prompts (server-only).

### 1.6 Dashboard (home) page

- Greeting header: "Good morning, Sachin" (time-aware), date, display serif.
- Overview cards (real data wiring lands in later phases; Phase 1 renders with empty/zero states): *New grant opportunities*, *Proposals in progress*, *Assets generated this month*, *Knowledge base size*.
- "Quick actions" row: New marketing asset · Scan for grants · Ask the knowledge base.
- Recent activity feed (reads `data/grants/activity-log.json` + marketing jobs when they exist; empty state until then).
- Signature element placeholder: a small ambient canvas panel labeled "CIBA Knowledge Graph" that becomes the live miniature in Phase 3.

### 1.7 Config, mock plumbing & phase QA

- `lib/config.ts` — typed env access, `isMockAI()`, model names, single place that throws helpful errors when keys are missing ("Add OPENAI_API_KEY to .env.local — see README").
- `lib/store/json.ts` — `readJson<T>(path, fallback)` / `writeJson(path, data)` with atomic write (tmp + rename) and in-process mutex; used by all `data/` persistence.
- Verify: build clean, all nav routes render, styleguide complete, Lighthouse-level pass on obvious a11y (landmarks, focus, contrast).

**Phase 1 exit criteria:** app runs, five nav destinations render with polished empty states, styleguide page proves the component library, dashboard greets the user, tokens/fonts/motion feel Apple-grade.

---

## Phase 2 — Marketing Studio

Goal: upload assets + a short brief → select output formats → gpt-image-1 generates branded event posters per format → gallery with download. Plus the video-generation placeholder experience.

### 2.1 Data model & persistence

`types/marketing.ts`:

```ts
type OutputFormat = "instagram_post" | "instagram_story" | "linkedin_post" | "mobile_post";
// instagram_post → 1024x1024 (1:1)
// instagram_story / mobile_post → 1024x1536 (portrait, closest to 9:16)
// linkedin_post → 1536x1024 (landscape, closest to 1.91:1)

interface MarketingJob {
  id: string;                    // nanoid
  kind: "image" | "video";
  brief: string;                 // user's event/announcement paragraph
  assetPaths: string[];          // uploaded source files in data/marketing/uploads/<jobId>/
  formats: OutputFormat[];
  status: "queued" | "generating" | "ready" | "failed";
  outputs: { format: OutputFormat; path: string }[];   // public/generated/<jobId>/<format>.png
  error?: string;
  createdAt: string; completedAt?: string;
}
```

- `features/marketing/data.ts` — CRUD over `data/marketing/jobs.json` via `lib/store/json.ts`.
- Uploads stored under `data/marketing/uploads/<jobId>/`; outputs written to `public/generated/<jobId>/` so `<img src>` works directly.

### 2.2 Upload & brief experience

- `features/marketing/asset-uploader.tsx` — drag-and-drop zone (dashed hairline, river tint on dragover) accepting PNG/JPG/WebP, max 6 files, 10MB each; thumbnail strip with remove buttons; client-side downscale of very large images (canvas, max edge 2048px) before upload to keep API payloads sane.
- Brief textarea: "Describe the event or announcement" with placeholder example and a 1,200-char soft counter.
- Optional fields: event name, date/venue line, CTA text (e.g. "Register at ciba.ca") — folded into the prompt when present.
- Upload handled by a server action writing files to the job's upload dir.

### 2.3 Format selection

- `features/marketing/format-picker.tsx` — multi-select cards, one per format, each showing a miniature aspect-ratio wireframe (1:1, 9:16, 1.91:1), platform icon, and dimension caption. Selected: river ring + check. "All formats" shortcut chip.
- Below the picker: cost hint line — "≈ N images will be generated" — and the primary button **Generate posters** (disabled until ≥1 asset or brief present and ≥1 format chosen).

### 2.4 Brand system prompt

- `lib/ai/prompts/marketing.ts` — composes the final generation prompt per format:
  1. Brand block from `brand/brand.md` (identity, colors, tone, logo rules).
  2. Hard rules: both CIBA and TRU logos must appear (they're passed as input images), legible text hierarchy, event details verbatim (no invented dates), palette adherence, format-specific composition guidance (story = vertical hero + bottom info band; linkedin = horizontal, title-led; square = centered focal).
  3. The user's brief + optional fields.
- Logos (`brand/ciba-logo.png`, `brand/tru-logo.png`) are automatically appended to the input image array on every image job.

### 2.5 Generation pipeline

- `app/api/marketing/generate/route.ts` (POST `{jobId}`):
  - Loads job, sets `generating`, then for each selected format calls `lib/ai/openai-images.ts` → `openai.images.edit({ model: "gpt-image-1", image: [ ...userAssets, cibaLogo, truLogo ], prompt, size, quality: env.IMAGE_QUALITY })`.
  - Formats generated **sequentially** (rate-limit friendly), each result saved to `public/generated/<jobId>/<format>.png`, job record updated incrementally so the UI can poll progress.
  - `MOCK_AI=true` → returns branded placeholder PNGs (pre-made gradient frames per aspect) after a 2s simulated delay; zero API calls.
  - Errors per-format are recorded without failing the whole job; job ends `ready` if ≥1 output, else `failed` with message.
- Client `features/marketing/generation-panel.tsx` polls job state every 1.5s while `generating` (simple, robust; no need for streaming here) and renders per-format status chips (queued → spinner → done/failed).

### 2.6 Results gallery & history

- `features/marketing/results-gallery.tsx` — outputs in a masonry-ish grid, each card aspect-correct with format badge; hover reveals **Download** (proper filename: `ciba-<event-slug>-<format>.png`) and **Regenerate** (re-runs just that format).
- Lightbox dialog on click (full-size preview, keyboard arrows between outputs).
- History section below the composer: previous jobs as rows (thumbnail strip, brief excerpt, date, status badge) — clicking reopens its gallery. Data from `jobs.json`, newest first.
- Page composition (`app/marketing/page.tsx`): left column composer (2.2 + 2.3), right column live preview/results; collapses to stacked under 1200px.

### 2.7 Video generation placeholder

- Tab switcher at the top of Marketing Studio: **Posters** | **Video** (Tabs component).
- Video tab reuses the uploader + brief, plus duration chips (10s / 15s / 20s) and format (16:9 / 9:16).
- `lib/video/provider.ts` — the future integration seam:
  ```ts
  interface VideoProvider {
    start(job: MarketingJob): Promise<{ providerJobId: string }>;
    poll(providerJobId: string): Promise<{ status: "generating"|"ready"|"failed"; url?: string; progress?: number }>;
  }
  export const videoProvider: VideoProvider = stubProvider; // swapped when real pipeline arrives
  ```
- `stubProvider` simulates a ~25s generation: progress advances realistically, then resolves with a bundled sample MP4 (`public/samples/ciba-sample.mp4`) so the full UX is demonstrable.
- `features/marketing/video-panel.tsx` — the requested display area: 16:9 (or 9:16) frame with shimmer skeleton, circular progress ring + **elapsed timer (mm:ss)** + rotating status lines ("Storyboarding scenes…", "Rendering frames…", "Adding brand outro…"); on ready, swaps to a `<video>` player with download button. Clearly labeled "Preview pipeline — production renderer coming soon" so expectations are honest.

**Phase 2 exit criteria:** with real keys, uploading assets + brief and selecting all three formats produces three branded posters saved to disk and downloadable; with mock mode the entire flow works free; video tab demonstrates the full job lifecycle with timer and player.

---

## Phase 3 — Knowledge OS

Goal: 18–20 interlinked markdown docs about CIBA, an Obsidian-style force graph over them, a polished document viewer, and a tool-calling AI assistant that answers questions by searching/reading only the docs it needs (no RAG).

### 3.1 Author the knowledge corpus (~19 docs)

All in `content/knowledge/`, realistic but clearly fictional-safe dummy content, dated 2024–2026, dense with `[[wikilinks]]` (every doc links to 3–6 others). Frontmatter schema:

```yaml
---
title: Venture Acceleration Program
type: program        # org | program | project | grant | meeting | partnership | event | internal
tags: [entrepreneurship, cohort]
date: 2026-01-15
status: active       # active | completed | draft | archived
summary: One-line summary used in graph previews and search results.
---
```

The corpus (interconnection is the point — an Obsidian-feel operating system for CIBA):

| # | Doc | Type |
|---|---|---|
| 1 | CIBA Overview & Mission | org |
| 2 | Team & Governance | org |
| 3 | Strategic Plan 2025–2027 | org |
| 4 | TRU Partnership Agreement | partnership |
| 5 | Venture Acceleration Program | program |
| 6 | Rural Entrepreneurship Initiative | program |
| 7 | Indigenous Business Mentorship Program | program |
| 8 | Student Startup Incubator (with TRU) | program |
| 9 | Project: Kamloops Food Innovation Hub | project |
| 10 | Project: Downtown Retail Revitalization Study | project |
| 11 | Project: AgriTech Pilot with Thompson Valley Growers | project |
| 12 | Grant: PacifiCan Business Scale-up 2025 (awarded) | grant |
| 13 | Grant: ETSI-BC Economic Diversification 2024 (completed) | grant |
| 14 | Grant: Innovate BC Ignite Application (submitted) | grant |
| 15 | Meeting Notes: Q1 2026 Board Meeting | meeting |
| 16 | Meeting Notes: TRU Innovation Office Sync (Mar 2026) | meeting |
| 17 | Partnership: Community Futures Thompson Country | partnership |
| 18 | Event: Kamloops Pitch Night 2026 | event |
| 19 | Internal: Grant Writing Playbook | internal |
| 20 | Internal: Brand & Communications Guide | internal |

Docs 12–14 and 19 double as the **grant sub-agent's organizational memory** in Phase 4 — the fit-analysis agent reads this same corpus.

### 3.2 Content layer (`lib/content/`)

- `loader.ts` — recursive read of `content/knowledge/`, `gray-matter` frontmatter parse, cached per-process with mtime invalidation. Returns `KnowledgeDoc { slug, path, title, type, tags, date, status, summary, content }`.
- `wikilinks.ts` — extract `[[Target]]` / `[[Target|alias]]` (regex from FirstResponders `markdown.tsx`); `resolveWikiTarget(target, docs)` matches by title then filename, case-insensitive.
- `graph.ts` — builds `{ nodes, edges }`: node per doc (id = slug, kind = type, degree computed for sizing), edge per resolved wikilink (deduped, weight = link count). Also `backlinksFor(slug)`.
- `search.ts` — the assistant's retrieval: tokenized keyword search over title+tags+content (FirstResponders `search_notes` algorithm: token `some`-match, snippet ±100 chars around first hit, top 6 results) plus a Fuse.js fuzzy index for the UI's quick-open. Two consumers, one module.

### 3.3 Graph canvas (`features/knowledge/graph-canvas.tsx`)

Direct port of the FirstResponders approach, restyled for light theme:

- d3-force simulation: `forceManyBody(-260)`, `forceLink(distance≈90, strength 0.5)`, `forceCenter(0.08)`, `forceCollide(22)`, alphaDecay 0.025.
- 2D canvas rendering, high-DPR; camera `{x, y, k}` for pan (drag background), zoom (wheel, cursor-anchored, 0.3–3×), node drag (fixes `fx/fy` during drag).
- Node paint: filled circle sized by degree (6–16px), `KIND_COLOR` per doc type (river, amber, sage, violet, slate… light-theme tuned), 1.5px white ring; label in Instrument Sans 11px below node, fading in above zoom 0.9; hover: node + neighbors full opacity, rest dimmed to 15%, connected edges highlighted.
- Edges: 1px `--color-line-strong`, slight curve, opacity by weight.
- Click: hit-test (`pick()` unproject pattern) → `select(slug)` in zustand store; click background deselects. Double-click node → navigate to full doc page.
- Idle ambience: simulation kept at a whisper alpha so the graph breathes (off under reduced motion).

### 3.4 Graph page & controls (`app/knowledge/page.tsx`)

- Full-bleed canvas with floating glass panels (white 80% + blur, hairline border):
  - Top-left: search input — matching nodes glow, others dim; Enter selects best match.
  - Top-right: type filter chips with kind-color dots (toggle doc types), node/edge count, zoom-to-fit button.
  - Bottom-left: legend.
- Right side panel (`node-preview.tsx`, 380px, slides in on select): doc title (serif), type badge, tags, date, summary, first ~40 lines rendered markdown, backlinks list, **Open document** button.
- `graph-store.ts` (zustand): `query, activeKinds, selected, hovered`.
- Dashboard miniature (closing the Phase 1.6 placeholder): non-interactive 300px canvas, same data, links to /knowledge.

### 3.5 Document viewer

- `app/knowledge/docs/[...slug]/page.tsx` — centered 720px column: type badge + date eyebrow, serif title, tag row, `.prose-ciba` markdown body.
- `features/knowledge/markdown.tsx` — FirstResponders port: preprocess `[[wikilinks]]` → `[label](wiki:target)`, custom `a` renderer turns `wiki:` hrefs into styled pills (river tint, hover underline) that navigate to the target doc; external links open new tab.
- Right rail: **Backlinks** ("Referenced by 4 documents") and **Links here** lists; mini local-graph (this node + 1-hop neighbors, tiny canvas).
- Cmd+K quick-open dialog: Fuse.js fuzzy search over all docs, arrow-key navigation — registered globally in the shell (works from any page).

### 3.6 Assistant agent & tools (`lib/ai/tools/knowledge.ts` + `app/api/assistant/route.ts`)

Tool-calling document selection, explicitly not RAG:

- Tools (Gemini function declarations):
  - `list_documents({ type? })` → `[ { slug, title, type, tags, summary, date } ]` — the map.
  - `search_documents({ query })` → top 6 `{ slug, title, snippet }` via `lib/content/search.ts`.
  - `read_document({ slug })` → full markdown content + metadata.
- System prompt: "You are CIBA's knowledge assistant. Answer only from the knowledge base. Workflow: search or list to locate candidate documents, read the most relevant ones (usually 1–3), then answer. Cite documents you used by title. If nothing relevant exists, say so plainly." Include today's date.
- Route: POST `{ messages }` → NDJSON stream via `runAgent` (`lib/ai/agent.ts`, maxSteps 8). Mock mode streams a canned trace (search → read → answer) so the UI is testable free.

### 3.7 Assistant UI (`features/assistant/assistant-view.tsx` + `app/assistant/page.tsx`)

- Clean chat: centered 720px thread, user messages right-tinted, assistant plain with avatar sparkle.
- **Tool activity chips** stream in live above the answer: "🔍 Searching: 'entrepreneurship initiatives'" (spinner) → "📄 Read: Rural Entrepreneurship Initiative" (check) — the FirstResponders `tool_start/tool_end` pattern; collapsed into a subtle "Consulted 3 documents ▾" expander once the answer starts.
- Cited doc titles in answers become links to the doc viewer.
- Suggested starter prompts on empty state ("What happened with the Food Innovation Hub?", "Show me initiatives related to entrepreneurship", "Which grants has CIBA won?").
- Multi-turn history kept client-side per session; **New chat** resets.

**Phase 3 exit criteria:** graph renders all ~20 docs with correct wikilink edges; click → preview → open doc → click wikilinks navigates fluidly; assistant answers corpus questions with visible tool steps and correct citations; Cmd+K works everywhere.

---

## Phase 4 — Grant Discovery Agent & Proposal Generation

Goal: a Gemini-3.5-Flash web-search agent that scans ~6 funding organizations for newly opened grants, dedupes against everything seen before, logs every scan, analyzes fit against CIBA's history, asks Sachin 5–6 tailored questions, and generates a complete markdown proposal.

### 4.1 Organization registry & data stores

- `data/grants/organizations.json` (seeded; editable via UI later):
  ```json
  [
    { "id": "pacifican",  "name": "PacifiCan (Pacific Economic Development Canada)", "url": "https://www.canada.ca/en/pacific-economic-development.html", "focus": "regional economic development, business scale-up" },
    { "id": "innovate-bc", "name": "Innovate BC", "url": "https://www.innovatebc.ca", "focus": "tech innovation, startup funding" },
    { "id": "etsi-bc",    "name": "ETSI-BC (Economic Trust of the Southern Interior)", "url": "https://www.etsi-bc.ca", "focus": "Southern Interior economic diversification" },
    { "id": "nrc-irap",   "name": "NRC IRAP", "url": "https://nrc.canada.ca/en/support-technology-innovation", "focus": "R&D and innovation advisory funding" },
    { "id": "vancouver-foundation", "name": "Vancouver Foundation", "url": "https://www.vancouverfoundation.ca", "focus": "community and nonprofit grants in BC" },
    { "id": "community-futures", "name": "Community Futures BC", "url": "https://www.communityfutures.ca", "focus": "rural small business support" }
  ]
  ```
  (User confirms/edits this list — see Appendix A.)
- `types/grants.ts`:
  ```ts
  interface Discovery {
    id: string;                 // hash(orgId + normalized title)  ← dedup key
    orgId: string; title: string; url?: string;
    deadline?: string; amount?: string; summary: string; eligibility?: string;
    firstSeenAt: string;
    status: "new" | "seen" | "shortlisted" | "dismissed" | "proposal_started";
    fit?: { score: number; rationale: string; relatedDocs: string[] };  // Phase 4.5
  }
  interface ScanLogEntry {
    id: string; startedAt: string; finishedAt: string;
    trigger: "manual";           // "scheduled" reserved for later
    orgsChecked: { orgId: string; found: number; new: number; error?: string }[];
    newDiscoveryIds: string[];
    searchQueries: string[];     // what the model actually searched
  }
  ```
- `features/grants/data.ts` — load/save both stores, `upsertDiscoveries()` returns which are genuinely new (id not present before).

### 4.2 Discovery agent (`lib/ai/grant-scout.ts` + `app/api/grants/scan/route.ts`)

- Per organization (sequential, one org at a time to control cost and rate limits):
  - `generateContent` on `gemini-3.5-flash` with `tools: [{ googleSearch: {} }]`, prompt: "Today is {date}. Search for currently open or recently announced grant/funding programs from {org.name} ({org.url}), focus: {org.focus}, relevant to a non-profit business accelerator in Kamloops, BC. Only include programs that appear open or upcoming. For each: title, url, deadline, amount, one-sentence summary, eligibility."
  - Second lightweight call (no search) coerces the answer to strict JSON against a schema (`responseMimeType: "application/json"` + `responseSchema`) — separating search from structuring keeps both reliable. Grounding metadata URLs from call 1 are attached to results.
- Dedup: compute `id = sha1(orgId + normalizeTitle(title))`; compare against **all** historical `discoveries.json` entries (not just last scan) — only unseen ids become `status: "new"`.
- Every run appends a complete `ScanLogEntry` (timestamps, per-org counts, errors, executed queries) — the audit trail the user asked for.
- Route streams NDJSON progress (`org_start`, `org_done`, `scan_done` with new-count) so the UI narrates the scan live. Mock mode: fixture discoveries with 2 "new" items, ~4s simulated scan.
- Per-org failure tolerance: an org that errors is logged and skipped; scan continues.

### 4.3 Grants page — discoveries UI (`app/grants/page.tsx`)

- Header: **Scan for new grants** primary button + "Last scanned {relative time}" caption.
- Live scan panel while running: org checklist animating through (spinner → "3 found, 1 new ✓"), overall progress bar — driven by the NDJSON stream.
- Discovery feed: cards grouped **New** (amber "NEW" badge, top) then **Previously seen**; each card: org chip, title, deadline countdown pill ("closes in 24 days", clay when <14), amount, summary, source link; actions: **Analyze fit** · Shortlist · Dismiss. Filters: org, status. New-count badge also appears on the sidebar Grants item.

### 4.4 Activity log UI

- Second tab on the grants page: **Activity log**.
- Reverse-chronological entries, mono timestamps: scan date/time, duration, orgs checked with per-org found/new counts, executed search queries (expandable), links to the discoveries found. Errors surfaced with clay badges.
- Empty state explains what scanning does before first run.

### 4.5 Fit-analysis sub-agent (`lib/ai/fit-analyst.ts`)

- Trigger: **Analyze fit** on a discovery.
- Agent loop (reuses `runAgent`) with the Phase 3 knowledge tools (`list_documents`, `search_documents`, `read_document`) over the same corpus — CIBA's past projects, grants, and the Grant Writing Playbook are its memory.
- System prompt: "Assess whether CIBA is a strong candidate for this grant. Search and read the knowledge base for relevant past projects, prior awarded grants, and organizational capabilities. Output: fit score 0–100, three-paragraph rationale citing specific documents, list of related doc slugs, and key strengths/gaps."
- Structured output (JSON schema) → stored on `discovery.fit`; card shows score dial (0–100 arc, river>70 / amber 40–70 / clay <40) + expandable rationale with doc links.

### 4.6 Clarifying questions flow

- **Start proposal** (on a fit-analyzed discovery) → `app/api/proposals/questions/route.ts`: Gemini generates 5–6 questions specific to this grant + fit analysis (budget figures, timeline, partners, measurable outcomes, alignment specifics). JSON schema output: `{ id, question, hint, inputType: "text" | "textarea" }`.
- `features/proposals/question-flow.tsx` — one question per step (large serif question, hint below, generous textarea), progress dots, back/next, review screen; answers saved to `data/proposals/<slug>/answers.json` as typed (draft-safe on refresh via localStorage mirror).

### 4.7 Proposal generation

- `app/api/proposals/generate/route.ts` — inputs: discovery (+fit), Q&A answers, and 2–3 most-related knowledge docs (from `fit.relatedDocs`, read directly — bounded context, no full corpus).
- System prompt (`lib/ai/prompts/proposal.ts`) — key excerpt:
  > You are a senior grant writer for CIBA… Produce a complete, submission-ready proposal in Markdown with these sections: Executive Summary, Organization Background, Project Description, Alignment with Funder Priorities, Work Plan & Timeline, Budget Overview, Expected Outcomes & Evaluation, Organizational Capacity, Conclusion. Ground every claim in the provided organizational context and the applicant's answers; never invent statistics or partner names. Plain, confident, specific language. **Formatting rule: never use em dashes ("—") anywhere in the document; restructure the sentence or use a comma, colon, or parentheses instead.** Use Markdown headings, short paragraphs, and bulleted lists where they genuinely help.
- Post-generation safety net: server-side `text.replace(/—|--/g, ...)` sanitizer, because instructions alone aren't a guarantee.
- Streamed to the client (NDJSON text deltas) into a live preview; on completion saved to `data/proposals/<slug>/proposal.md` + `meta.json` (`status: "draft"`), then redirect to the Phase 5 editor route.
- Proposals list section on the grants page: title, linked grant, status badge (draft / in review / exported), updated time → opens editor.

**Phase 4 exit criteria:** pressing Scan produces a narrated live scan, correctly deduped NEW items, and a complete activity-log entry; fit analysis visibly reads real knowledge docs and produces a scored rationale; the Q&A flow generates a full multi-section proposal with zero em dashes, saved to disk.

---

## Phase 5 — Proposal Editor, Export & Final Polish

Goal: Notion-grade editing over generated proposals, AI-assisted rewriting, beautiful PDF + DOCX export, then a whole-app polish pass.

### 5.1 Tiptap editor foundation

- Install `@tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder tiptap-markdown` (+ `@tiptap/extension-typography`).
- `features/proposals/editor.tsx` — Tiptap wrapping `proposal.md` with full markdown round-trip (`tiptap-markdown`: load md → edit rich → serialize md on save). Document styling matches `.prose-ciba`: serif headings, 720px measure, calm spacing — editing feels like the finished document.
- Editor route `app/grants/proposals/[slug]/page.tsx`: title bar (inline-editable title, status badge, saved-state indicator "Saved · just now"), actions right: **Export ▾** (PDF / Word), AI assistant toggle.

### 5.2 Notion-style interactions

- **Slash menu** (`/`): floating command palette — Heading 1/2/3, Bulleted list, Numbered list, Quote, Divider, Code block; fuzzy filter, arrow keys, Enter.
- **Bubble menu** on text selection: Bold, Italic, Strikethrough, Code, H1/H2/H3, Bullet/Ordered list, Quote — plus a river-tinted **✦ AI** button (→ 5.3).
- Markdown input shortcuts (`## `, `- `, `1. `, `> ` auto-convert), placeholder "Start writing, or press / for blocks…", drag-handle block reordering if stable in current Tiptap, otherwise skip (note decision in MEMORY.md).
- Cmd+S manual save + autosave (5.4); Cmd+B/I/etc. native Tiptap.

### 5.3 AI editing (`app/api/proposals/rewrite/route.ts`)

- Selection AI (from bubble ✦): popover with quick actions — **Rewrite**, **Shorten**, **Expand**, **More formal**, **Simplify** — plus free-form instruction input ("make this more specific about rural impact").
- Request: `{ scope: "selection" | "document", text, instruction, proposalContext }` → Gemini rewrite honoring the same no-em-dash rule + sanitizer → streamed back.
- Selection scope: result shown in a compare popover (old vs new, subtle diff shading) with **Replace** / **Discard**; replace is a single undoable Tiptap transaction.
- Document scope (from AI panel): "Rewrite entire proposal" with instruction; streams into a right-side preview panel; **Apply** swaps full content (snapshot version saved first), Cmd+Z still works.

### 5.4 Autosave & versions

- Debounced autosave (1.5s idle) via server action → `proposal.md` + `meta.updatedAt`; status indicator cycles "Editing…" → "Saved".
- Snapshot to `versions/<ISO>.md` on: editor open, before document-level AI apply, before export. Keep last 20.
- Version history popover: timestamped list, click to preview in dialog, **Restore** (itself snapshots first).

### 5.5 PDF export (`app/api/proposals/export/pdf/route.ts` + `lib/export/pdf.ts`)

- Pipeline: markdown → HTML (unified/remark, `.prose-ciba`-equivalent print stylesheet) → Puppeteer (`puppeteer` full install, local headless Chromium) → A4 PDF.
- Template: cover page (CIBA logo, proposal title in Instrument Serif, grant name + funder, date, "Prepared by CIBA" + TRU lockup) → body with running header (proposal title, small caps) and footer ("CIBA · Central Interior Business Accelerator — page N of M"), 25mm margins, headings avoid orphaning (`break-after: avoid`), river-accent section rules.
- Fonts embedded locally (bundled woff2) so PDF renders identically offline.
- Route returns the PDF (`Content-Disposition: attachment; filename="CIBA-<slug>.pdf"`); export button shows progress state; snapshot taken; `meta.status → "exported"`.

### 5.6 DOCX export (`app/api/proposals/export/docx/route.ts` + `lib/export/docx.ts`)

- `docx` npm package. Markdown AST (remark parse) → docx elements: H1–H3 → styled Heading1–3 (serif-look, river color), paragraphs (11pt, 1.4 spacing), bold/italic runs, bullets/numbering, blockquote → indented italic, table support.
- Document styles + cover header with logo image, footer with page numbers. Same filename convention.
- Known-limitation note in README: complex nested markdown may simplify in Word; PDF is the canonical output.

### 5.7 Final whole-app polish pass

- **Dashboard goes live:** real counts (new grants, proposals in progress, assets generated, KB size), real recent-activity feed, live graph miniature.
- Motion audit: consistent page entrances, dialog/toast choreography, one pass to *remove* excess (skill: "remove one accessory").
- Empty/loading/error states audited on every page; all errors explain the fix.
- Keyboard: Cmd+K everywhere, Esc closes panels/dialogs, visible focus order sensible on all pages.
- Copy audit: sentence case, outcome-stating buttons, consistent vocabulary (always "scan", "discovery", "proposal" — never synonyms).
- Performance: graph steady at 60fps with 20 nodes (trivial) but tested to 200; images lazy-loaded; routes code-split naturally; `npm run build` warnings zeroed.
- Accessibility: contrast ≥4.5:1 body text, aria labels on icon buttons, reduced-motion verified, dialogs trap focus.
- README finalized: setup, keys, mock mode, folder map, how to swap in the real video provider, how to edit the funding-org registry and brand.md.
- Full manual QA run of Appendix C.

**Phase 5 exit criteria:** a generated proposal can be edited like Notion, AI-rewritten at selection and document level, exported to a genuinely beautiful PDF and a clean DOCX; the whole app passes the polish checklist and feels like one coherent product.

---

## Appendix A — What I need from the user

**Before Phase 2 (marketing):**
1. `OPENAI_API_KEY` — platform.openai.com → API keys. Note: `gpt-image-1` may require one-time organization verification on the OpenAI dashboard.
2. CIBA logo + TRU logo as PNG (transparent) or SVG, dropped into `brand/`. Any official brand colors/fonts if they exist; otherwise I extract from the logos and my brand.md draft stands.

**Before Phase 3/4 (agents):**
3. `GEMINI_API_KEY` — aistudio.google.com → Get API key (free tier is fine to start).
4. Confirm/correct the six funding organizations in 4.1 (I seeded: PacifiCan, Innovate BC, ETSI-BC, NRC IRAP, Vancouver Foundation, Community Futures BC).

**Optional, anytime:** real facts about CIBA's past projects/grants to replace my fictional corpus (the structure won't change), and later the video-generation pipeline details for the Phase 2.7 provider seam.

Share keys by pasting them into `ciba-os/.env.local` yourself (preferred) or in chat and I'll place them.

## Appendix B — Cost-conservation rules

- `MOCK_AI=true` is the default during development; every AI route has a fixture path. Real calls only for explicit end-to-end verification.
- Images: `IMAGE_QUALITY=low` in dev; generation only ever fires on an explicit button press showing the image count first; per-format sequential with incremental saves (a failure never wastes completed outputs).
- Grant scans: manual button only (no scheduler in v1); one org at a time; search call and JSON-structuring call separated so retries never repeat billable searches.
- Assistant/proposals: flash-tier model; fit analysis reads at most ~3 full docs; proposal context is bounded (never the whole corpus).
- No polling of paid APIs anywhere; job polling hits only local state.

## Appendix C — QA checklist

Run at the end of each phase (relevant subset) and fully in 5.7:

- [ ] `npm run build` + `npm run typecheck` clean
- [ ] Every page renders with empty `data/` (fresh clone experience)
- [ ] Every AI feature works in mock mode with no keys present
- [ ] Marketing: 6-asset upload, all formats, download filenames correct, history reopens
- [ ] Video: timer counts, progress completes, player renders, label honest
- [ ] Graph: pan/zoom/drag/hover/select/open at 60fps; filters and search correct
- [ ] Doc viewer: every wikilink in all ~20 docs resolves; backlinks correct
- [ ] Assistant: tool chips stream; citations link; unanswerable questions refused gracefully
- [ ] Scan: dedup verified across two consecutive scans; log entry complete; org failure tolerated
- [ ] Proposal: no em dash anywhere in generated output (grep the file)
- [ ] Editor: markdown round-trip lossless on generated proposals; undo after AI apply
- [ ] Exports: PDF cover/footers/page numbers correct; DOCX opens clean in Word
- [ ] Keyboard: Cmd+K, Esc, focus rings; reduced-motion pass
- [ ] Copy pass: sentence case, outcome verbs, consistent nouns
