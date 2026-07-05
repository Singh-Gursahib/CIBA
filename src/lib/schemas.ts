import { z } from "zod";

// ---- Founder Intake & Triage ----
export const triageInputSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  location: z.string().default(""),
  pitch: z.string().min(10),
  traction: z.string().default(""),
  ask: z.string().default(""),
});
export type TriageInput = z.infer<typeof triageInputSchema>;

export const triageResultSchema = z.object({
  stage: z
    .enum(["idea", "validation", "growth", "operating"])
    .describe("Best-fit stage for this founder/business."),
  readiness: z
    .number()
    .min(0)
    .max(100)
    .describe("How ready this venture is to benefit from an accelerator right now, 0-100."),
  summary: z.string().describe("2-3 sentence plain-language summary of the business for CIBA staff."),
  serviceAreas: z
    .array(z.string())
    .describe("IDs of the 1-3 most relevant CIBA service areas, most important first."),
  recommendedProgram: z.string().describe("ID of the single best-fit CIBA program."),
  strengths: z.array(z.string()).describe("2-3 concrete strengths."),
  gaps: z.array(z.string()).describe("2-3 concrete gaps or risks to probe."),
  staffBrief: z
    .string()
    .describe("A short internal brief (3-5 bullet lines) prepping a CIBA advisor for the first call."),
  nextSteps: z.array(z.string()).describe("2-3 concrete next steps for the founder."),
});
export type TriageResult = z.infer<typeof triageResultSchema>;

// ---- Mentor Matching ----
export const matchInputSchema = z.object({
  founderSummary: z.string().min(10),
  stage: z.string().default("validation"),
  industry: z.string().default(""),
  need: z.string().default(""),
});
export type MatchInput = z.infer<typeof matchInputSchema>;

export const matchResultSchema = z.object({
  matches: z
    .array(
      z.object({
        mentorId: z.string(),
        score: z.number().min(0).max(100),
        why: z.string().describe("1-2 sentences on why this mentor fits this founder."),
        watchout: z.string().describe("One honest caveat about the match (capacity, gap, etc.)."),
      }),
    )
    .describe("Ranked mentors, best first (return the top 3)."),
});
export type MatchResult = z.infer<typeof matchResultSchema>;

// ---- AI Readiness Assessment ----
export const readinessInputSchema = z.object({
  business: z.string().min(1),
  industry: z.string().default(""),
  teamSize: z.string().default(""),
  answers: z.record(z.string(), z.string()),
});
export type ReadinessInput = z.infer<typeof readinessInputSchema>;

export const readinessResultSchema = z.object({
  score: z.number().min(0).max(100).describe("Overall AI-readiness score 0-100."),
  band: z.enum(["Exploring", "Ready", "Accelerating"]).describe("Readiness band."),
  headline: z.string().describe("One punchy sentence summarizing where they are."),
  opportunities: z
    .array(
      z.object({
        title: z.string(),
        problem: z.string().describe("The specific day-to-day pain this addresses."),
        solution: z.string().describe("A concrete, practical AI application in plain language."),
        impact: z.enum(["low", "medium", "high"]),
        effort: z.enum(["low", "medium", "high"]),
      }),
    )
    .describe("The top 3 practical AI opportunities for this business, best first."),
  firstProject: z.string().describe("The single recommended first AI project and why to start there."),
  cibaHook: z.string().describe("One sentence on how CIBA's AI Skills Accelerator would help them do this."),
});
export type ReadinessResult = z.infer<typeof readinessResultSchema>;
