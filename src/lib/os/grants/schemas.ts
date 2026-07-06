import { z } from "zod";

/** Structured grants extracted from a funder scan. */
export const grantScanSchema = z.object({
  grants: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().optional(),
        deadline: z.string().optional(),
        amount: z.string().optional(),
        summary: z.string(),
        eligibility: z.string().optional(),
      }),
    )
    .describe("Open grant/funding programs found for this funder."),
});
export type ScannedGrant = z.infer<typeof grantScanSchema>["grants"][number];

/** Fit analysis of one grant against CIBA. */
export const fitSchema = z.object({
  score: z.number().int().describe("0–100 fit score."),
  rationale: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
});

/** Intake questions for the proposal wizard. */
export const questionsSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      hint: z.string().optional(),
      inputType: z.enum(["text", "textarea"]),
    }),
  ),
});
