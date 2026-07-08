import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canAccessProject } from "@/lib/os/store";
import { canUseMarketing } from "@/lib/os/marketing/access";
import { insertJob } from "@/lib/os/marketing/store";
import { ALL_FORMATS, buildPosterSvg, FORMAT_META, type PosterFormat, type PosterInput } from "@/lib/os/marketing/poster";
import { composePosterPrompt } from "@/lib/os/marketing/prompts";
import { generatePosterImage, isRealImageEnabled, brandLogosPresent } from "@/lib/os/marketing/openai-images";
import type { MarketingJob, PosterOutput } from "@/lib/os/marketing/types";

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Wrap a generated PNG in a minimal SVG so it flows through the exact same
// `output.svg` field the view already renders (data:image/svg+xml). This keeps
// the store/types/view untouched while carrying a real raster image.
function pngToSvg(png: Buffer, format: PosterFormat): string {
  const { w, h } = FORMAT_META[format];
  const href = `data:image/png;base64,${png.toString("base64")}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" xlink:href="${href}"/></svg>`;
}

// Build one output per format. Real AI path (gpt-image-1) is used only when an
// OpenAI key is configured and mock mode is off; any failure falls back to the
// deterministic SVG so the studio never breaks. The zero-key demo path is the
// unchanged SVG generator.
async function buildOutput(input: PosterInput): Promise<PosterOutput> {
  if (isRealImageEnabled()) {
    try {
      const prompt = composePosterPrompt(input, brandLogosPresent());
      const png = await generatePosterImage(prompt, input.format);
      return { format: input.format, svg: pngToSvg(png, input.format) };
    } catch (err) {
      console.error("Real poster generation failed, falling back to SVG:", err);
    }
  }
  return { format: input.format, svg: buildPosterSvg(input) };
}

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canUseMarketing(member)) return NextResponse.json({ error: "Marketing Studio is limited to Marketing and the Executive." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Add a title or headline." }, { status: 400 });
  const formats: PosterFormat[] = Array.isArray(body?.formats) ? body.formats.filter((f: string) => (ALL_FORMATS as string[]).includes(f)) : [];
  if (formats.length === 0) return NextResponse.json({ error: "Choose at least one format." }, { status: 400 });

  const eyebrow = String(body?.eyebrow ?? "").trim() || undefined;
  const details = String(body?.details ?? "").trim() || undefined;
  const cta = String(body?.cta ?? "").trim() || undefined;
  const projectIdRaw = String(body?.projectId ?? "").trim() || undefined;
  const projectId = projectIdRaw && canAccessProject(member, projectIdRaw) ? projectIdRaw : undefined;

  const job: MarketingJob = {
    id: newId(),
    memberId: member.id,
    projectId,
    eyebrow,
    title,
    details,
    cta,
    formats,
    outputs: await Promise.all(formats.map((format) => buildOutput({ format, eyebrow, title, details, cta }))),
    createdAt: new Date().toISOString(),
  };
  await insertJob(job);
  return NextResponse.json({ job });
}
