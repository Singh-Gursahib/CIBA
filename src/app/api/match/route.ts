import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { AI_ENABLED, reasoningModel } from "@/lib/ai";
import { demoMatch } from "@/lib/demo";
import { MENTORS } from "@/lib/mentors";
import { matchInputSchema, matchResultSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = matchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  if (!AI_ENABLED) {
    return NextResponse.json({ result: demoMatch(input), mode: "demo" });
  }

  try {
    const roster = MENTORS.map(
      (m) =>
        `${m.id} | ${m.name} — ${m.title} (${m.location}) | expertise: ${m.expertise.join(", ")} | ` +
        `industries: ${m.industries.join(", ")} | strong stages: ${m.stages.join(", ")} | capacity: ${m.capacity}`,
    ).join("\n");

    const { object } = await generateObject({
      model: reasoningModel,
      schema: matchResultSchema,
      system:
        "You match founders to mentors for CIBA (Central Interior Business Accelerator). " +
        "Weigh industry fit, stage fit, the founder's stated need, and mentor capacity. " +
        "Be honest: surface a real caveat for each match. Only use mentor IDs from the roster. Return the top 3.",
      prompt:
        `MENTOR ROSTER:\n${roster}\n\n` +
        `FOUNDER:\nSummary: ${input.founderSummary}\nStage: ${input.stage}\n` +
        `Industry: ${input.industry || "(unspecified)"}\nMost needs help with: ${input.need || "(unspecified)"}`,
    });
    return NextResponse.json({ result: object, mode: "ai" });
  } catch (err) {
    console.error("match AI error, falling back to demo:", err);
    return NextResponse.json({ result: demoMatch(input), mode: "demo-fallback" });
  }
}
