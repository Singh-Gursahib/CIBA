# CIBA Launchpad + CIBA OS

A real-use-case prototype built for **CIBA — Central Interior Business Accelerator** (formerly Kamloops Innovation), the nonprofit accelerator based at the Thompson Rivers University campus in Kamloops, BC, serving founders across the Thompson, Nicola & Cariboo regions.

Two halves:
1. **Launchpad** (public tools) — automates the three activities that take the most staff time
2. **CIBA OS** (`/os`) — the internal operating system for the whole organization

## CIBA OS — the internal platform

Sign in as any of 5 team members (`/os-login`); **everything is permission-scoped** — each member sees only the collaborations, funding, documents, and integrations their role allows.

| Module | What it does |
|---|---|
| **Dashboard** (`/os`) | Your scoped view: collaborations, impact rollup (ventures/jobs/revenue — the numbers CIBA reports to funders), funding rollup, **deadline radar** for funder reports, team activity feed |
| **Project workspaces** (`/os/projects/[id]`) | Per-collaboration hub: partners, team, funding records, social calendar, documents (sensitive docs gated to lead + executives), ventures |
| **Finance** (`/os/finance`) | Full statements: balance sheet (Statement of Financial Position), income statement (Statement of Operations), 6-month revenue/expense trend, **3-month cash forecast** with closing cash + runway. Gated to finance-access members only |
| **Brain Map** (`/os/brain-map`) | Live force-directed graph of the whole org — CIBA ↔ collaborations ↔ partners ↔ members ↔ integrations ↔ ventures. Draggable, hover-highlighting, click-to-inspect. Scoped: an executive sees the whole brain, others see their slice |
| **Social Studio** (`/os/social`) | Create short-form video and **publish it to YouTube + Instagram** from the OS — voiceover + stock-footage render (or upload your own), AI-written copy, and channel/post analytics. Role-scoped to Marketing + Executive; demo-mode-first. See [docs/SOCIAL.md](docs/SOCIAL.md) |
| **Integrations** (`/os/integrations`) | Financing ledger (QuickBooks), social publishing (YouTube / Instagram via the Studio), events (Eventbrite), document vault (Drive), venture CRM (Airtable), AI layer — with per-role operate permissions and health status |
| **AI Assistant** (`/os/assistant`) | The LLM access layer: the model receives **only the signed-in member's scoped data** — it can't leak what it never saw. Ask the same question as different members and watch answers change |

### It's operable, not just a view

The OS ships with rich seed data, but every member can **create records that flow through the whole system**. Add a **venture** (Ventures page), **log funding** or **add a document** (any collaboration page), or — as the Executive Director — **stand up a new collaboration** (Dashboard). New records are permission-scoped exactly like seed data and immediately update the impact/funding rollups, deadline radar, project pages, brain map, and the AI assistant's context. Additions persist to `.data/os-overlay.json` (gitignored) on top of the immutable seed.

The collaborations are CIBA's **real programs and partners**: TRU Generator (Thompson Rivers University), Road to Web Summit Vancouver (Innovate BC), AccelerateIP (New Ventures BC + Innovate BC), ThreeSixty & Delta delivery (Accelerate Okanagan / PacifiCan), Applied AI Implementation Clinics (Discovery Foundation), AI Skills Accelerator (KPMG sponsor), Indigenous business development (Sc.wén̓wen / Tk̓emlúps te Secwépemc), newcomer workshops (Kamloops Immigration Services), and the ETSI-BC-funded strategic plan. Team members, ventures, dollar amounts, and documents are illustrative dummy data.

### The 5 demo members
| Member | Role | Sees |
|---|---|---|
| Sachin Singh | Executive Director | Everything |
| Rob Tremblay | Programs Manager | TRU Generator, R2WSV, AccelerateIP, ThreeSixty & Delta |
| Sofia Marques | Partnerships & Funding Lead | ThreeSixty & Delta, AI Clinics, Strategic Plan, AI Skills + **Finance** |
| Jake Williams | Marketing Coordinator | R2WSV, AI Skills, AI Clinics + social integrations |
| Anita Baptiste | Indigenous & Regional Outreach | Indigenous partnership, newcomer workshops, TRU Generator |

## Launchpad (public tools)

## The three tools

| Tool | Who | The real problem it solves |
|------|-----|----------------------------|
| **Founder Intake & Triage** (`/intake`) | Founders (public) | Manual, subjective intake. A founder describes their venture → AI pins the **stage**, scores **accelerator-readiness (0–100)**, maps them to CIBA's **six real service areas**, routes them to the right **program**, and writes a **staff brief** so the first call starts warm. |
| **Mentor Matching** (`/dashboard`) | CIBA staff | Matching 250+ entrepreneurs to advisors from memory. Paste a founder profile → the engine **ranks the mentor network** by industry / stage / expertise fit, with a "why matched" and an honest caveat each. |
| **AI-Readiness Assessment** (`/ai-readiness`) | Local SMBs (public) | Selling "AI adoption" without a tangible demo. An SMB answers 5 questions → a **practical AI opportunity report** (top wins by effort/impact + a recommended first project). Doubles as a lead magnet for CIBA's **AI Skills Accelerator**. |

Everything is grounded in CIBA's actual service areas and programs (`src/lib/ciba.ts`), not generic startup boilerplate.

## Runs with zero setup

The app works fully in **demo mode** out of the box — a deterministic heuristic engine (`src/lib/demo.ts`) powers every result with no API key. Add an Anthropic key and each route switches to real Claude reasoning (`generateObject` + zod schemas). If a live call fails, it gracefully falls back to demo mode.

```bash
pnpm install
pnpm dev            # http://localhost:3000  (demo mode)

# For real Claude reasoning:
cp .env.example .env.local
# add ANTHROPIC_API_KEY=... then restart
```

## Stack

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS 4**
- **Vercel AI SDK** (`ai`, `@ai-sdk/anthropic`) with **Claude Haiku 4.5** (triage / readiness) and **Claude Sonnet 5** (mentor matching)
- **Zod** schemas for structured, validated AI output

## Structure

```
src/
  app/
    page.tsx                 landing
    intake/                  founder intake & triage UI
    ai-readiness/            SMB AI-readiness quiz UI
    dashboard/               staff mentor-matching UI
    api/{triage,match,ai-readiness}/route.ts   AI endpoints (+ demo fallback)
  lib/
    ciba.ts                  CIBA service areas, programs, stages
    mentors.ts               mentor network seed data
    schemas.ts               zod input/output schemas
    ai.ts                    model config + AI_ENABLED flag
    demo.ts                  deterministic demo-mode engine
```

## Deploy

Push to a Git repo and import into Vercel, or run `vercel`. Set `ANTHROPIC_API_KEY` in project env vars for live AI (optional).

---

*Prototype — not affiliated with or endorsed by CIBA. Mentor data is illustrative seed data.*
