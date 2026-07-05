import "server-only";
import type { Discovery } from "@/types/grants";

/** Deterministic, well-structured mock proposal so the flow works without a key. */
export function mockProposal(opts: {
  discovery: Discovery;
  answers: Record<string, string>;
  title: string;
}): string {
  const { discovery, answers, title } = opts;
  const a = (k: string, fallback: string) =>
    Object.entries(answers).find(([q]) => q.toLowerCase().includes(k))?.[1] || fallback;

  const budget = a("budget", "a total budget to be finalized with the funder");
  const timeline = a("timeline", "a twelve month delivery period with quarterly milestones");
  const participants = a("participant", "SMEs, entrepreneurs, and student founders across the BC Central Interior");
  const outcomes = a("outcome", "AI adoption among SMEs, new ventures supported, and measurable economic impact");

  return `# ${title}

## Executive Summary

CIBA (Central Interior Business Accelerator) respectfully submits this proposal for ${discovery.title}. As a regional innovation hub serving the Central Interior of British Columbia, working alongside its strategic academic partner Thompson Rivers University, CIBA is well positioned to deliver results that match this funder's focus on ${discovery.summary.toLowerCase().replace(/\.$/, "")}. The work advances CIBA's three pillars of Innovation, Collaboration, and Investment, and will serve ${participants} to produce ${outcomes}.

## Problem Statement

SMEs and founders in the Central Interior face uneven access to innovation support, AI adoption capacity, and the collaborative networks that turn ideas into durable regional growth. Without focused, action-oriented programming, promising ventures stall and regional economic potential goes unrealized.

## Beneficiaries

The project serves ${participants}. It prioritizes practical learning, inclusivity, and measurable benefit for the businesses and communities of the region.

## Program Description

CIBA delivers focused, action-oriented programming built on repeatable frameworks: workshops, mentorship, SME pilots, and student innovation activities. The program builds on existing delivery infrastructure so that funds translate quickly into activity on the ground rather than administrative overhead.

## Logic Model

- Inputs: funding, CIBA staff and mentors, TRU research and talent, community relationships
- Activities: workshops, mentorship, SME pilots, matchmaking, knowledge sharing
- Outputs: businesses supported, pilots completed, participants trained
- Outcomes: AI adoption, venture growth, and a stronger regional innovation ecosystem

## KPIs

| Indicator | Baseline | Target | Measurement |
| --- | --- | --- | --- |
| SMEs supported | 0 | 12 to 15 | Program records |
| Participants trained | 0 | 120 | Attendance and completion |
| Pilots completed | 0 | 10 | Pilot reporting |
| Reported AI adoption | Baseline survey | 60% of participants | Follow-up survey |

## Risk Assessment

- Operational: delivery capacity, mitigated by repeatable frameworks and mentor bench depth
- Financial: budget variance, mitigated by realistic budgeting and mid-point reviews
- Stakeholder: partner alignment, mitigated by clear roles and regular communication
- Technical: AI implementation gaps, mitigated by readiness assessments and staged pilots

## Budget

The project is planned around ${budget}.

| Category | Description | Share |
| --- | --- | --- |
| Program delivery | Workshops, mentorship, and pilot support | 55% |
| Personnel | Coordination and evaluation | 25% |
| Collaboration | Contributions across ecosystem organizations | 12% |
| Administration | Reporting and overhead | 8% |

## Governance

CIBA's Executive Director and Board provide oversight. Baseline KPIs, mid-point updates, and final reports keep the project accountable and transparent to the funder.

## Impact Narrative

The project reinforces CIBA's Innovation Flywheel, where AI, innovation, collaboration, student talent, SME growth, and funder reinvestment strengthen one another. It runs over ${timeline} and contributes to durable regional impact.

## Sustainability

Beyond the grant, the work continues through quarterly peer circles, mentor expansion, memberships and sponsorships, training revenue, further grants, and MOUs, ensuring the ecosystem compounds over time.

_This is a mock proposal generated without an AI key. Add a Gemini key and set MOCK_AI=false for a fully tailored draft._
`;
}
