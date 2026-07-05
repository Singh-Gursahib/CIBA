# CIBA OS

AI workflow platform for CIBA (Central Interior Business Accelerator), Kamloops BC, built with Next.js. Three pillars:

- **Marketing Studio** — branded event posters (gpt-image-1) in every social format, plus a promotional video pipeline.
- **Grants** — an AI agent that scans BC and Canada funders for new opportunities, analyzes fit against CIBA's history, and drafts complete proposals with a Notion-style editor and PDF / Word export.
- **Knowledge** — an Obsidian-style graph over CIBA's documents with a tool-calling assistant that answers questions by reading only the documents it needs.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in keys
npm run dev
```

Open http://localhost:3000.

### Environment

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Marketing poster generation (gpt-image-1) |
| `GEMINI_API_KEY` | Grant discovery, proposals, knowledge assistant |
| `GEMINI_TEXT_MODEL` | Text model, default `gemini-3.5-flash` |
| `IMAGE_QUALITY` | `low` (dev default) / `medium` / `high` |
| `MOCK_AI` | `true` = every AI feature uses zero-cost fixtures. Default when unset. |

**Mock mode:** with `MOCK_AI=true` the entire app works with no keys — posters render as branded SVG placeholders, video uses a bundled sample render. Set `MOCK_AI=false` for real generation.

## Branding

- Drop the real logo files at `brand/ciba-logo.png` and `brand/tru-logo.png` — they are automatically attached to every image-generation request.
- `brand/brand.md` is the written design language injected into generation prompts. Edit it freely; no code changes needed.

## Folder map

```
app/           routes + API endpoints
components/    ui/ (design system) and layout/ (shell)
features/      feature-scoped components, data loaders, server actions
lib/           ai/ (providers, prompts, mock), store/ (JSON persistence), video/ (provider seam), utils/
content/       knowledge-base markdown documents (Phase 3)
brand/         logos + brand.md
data/          runtime state: jobs, uploads, generated outputs (gitignored)
types/         shared TypeScript types
```

## Proposals: editing and export

Generated proposals open in a Notion-style Tiptap editor (`/grants/proposals/<slug>`): slash menu for blocks, a bubble menu with AI rewrite (selection or whole document), autosave with version history, and one-click export to PDF (Puppeteer, cover page + running footers) or Word (`.docx`). The no-em-dash rule is enforced by prompt and by a server-side sanitizer on every save and generation. PDF is the canonical output; complex nested Markdown may simplify slightly in Word.

## Swapping in the real video pipeline

Implement `VideoProvider` in `lib/video/provider.ts` (`start` + `poll`) and replace the `stubProvider` export. The UI (progress ring, elapsed timer, stage labels, player) works unchanged.

## Scripts

- `npm run dev` — development server
- `npm run build` / `npm start` — production
- `npm run typecheck` — TypeScript check
- `/styleguide` — internal design-system reference page
