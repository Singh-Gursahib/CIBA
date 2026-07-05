import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { AI_ENABLED, model } from "@/lib/ai";
import { PROGRAMS, SERVICE_AREAS, STAGES } from "@/lib/ciba";
import { demoTriage } from "@/lib/demo";
import { triageInputSchema, triageResultSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = triageInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  if (!AI_ENABLED) {
    return NextResponse.json({ result: demoTriage(input), mode: "demo" });
  }

  try {
    const { object } = await generateObject({
      model,
      schema: triageResultSchema,
      system:
        "You are an intake analyst for CIBA (Central Interior Business Accelerator) in Kamloops, BC. " +
        "You triage founders into the right stage, service areas, and program, and prep staff for the first call. " +
        "Be concrete, honest about gaps, and grounded in what the founder actually said.\n\n" +
        `Valid stages: ${STAGES.map((s) => `${s.id} (${s.desc})`).join("; ")}.\n` +
        `Valid service area IDs: ${SERVICE_AREAS.map((s) => `${s.id} = ${s.name}`).join("; ")}.\n` +
        `Valid program IDs: ${PROGRAMS.map((p) => `${p.id} = ${p.name} — for ${p.fit}`).join("; ")}.\n` +
        "Return only IDs from these lists.",
      prompt:
        `Founder: ${input.name}\nCompany: ${input.company}\nLocation: ${input.location}\n` +
        `Pitch: ${input.pitch}\nTraction: ${input.traction || "(none provided)"}\n` +
        `What they're asking CIBA for: ${input.ask || "(not specified)"}`,
    });
    return NextResponse.json({ result: object, mode: "ai" });
  } catch (err) {
    console.error("triage AI error, falling back to demo:", err);
    return NextResponse.json({ result: demoTriage(input), mode: "demo-fallback" });
  }
}
