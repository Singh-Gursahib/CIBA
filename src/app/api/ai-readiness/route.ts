import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { AI_ENABLED, model } from "@/lib/ai";
import { demoReadiness } from "@/lib/demo";
import { readinessInputSchema, readinessResultSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = readinessInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  if (!AI_ENABLED) {
    return NextResponse.json({ result: demoReadiness(input), mode: "demo" });
  }

  try {
    const answers = Object.entries(input.answers)
      .map(([q, a]) => `- ${q}: ${a}`)
      .join("\n");

    const { object } = await generateObject({
      model,
      schema: readinessResultSchema,
      system:
        "You assess an SMB's readiness to adopt AI, on behalf of CIBA's AI Skills Accelerator (Kamloops, BC). " +
        "Be practical and encouraging, not hypey. Opportunities must be concrete, cheap-to-start, and tied to the " +
        "business's actual day-to-day pain — no buzzwords. Recommend a realistic first project.",
      prompt:
        `Business: ${input.business}\nIndustry: ${input.industry || "(unspecified)"}\n` +
        `Team size: ${input.teamSize || "(unspecified)"}\n\nAssessment answers:\n${answers}`,
    });
    return NextResponse.json({ result: object, mode: "ai" });
  } catch (err) {
    console.error("ai-readiness AI error, falling back to demo:", err);
    return NextResponse.json({ result: demoReadiness(input), mode: "demo-fallback" });
  }
}
