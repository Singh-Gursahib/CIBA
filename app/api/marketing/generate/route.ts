import { NextResponse } from "next/server";
import { getJob, patchJob } from "@/features/marketing/data";
import { composePosterPrompt } from "@/lib/ai/prompts/marketing";
import { generatePoster, writeOutput, brandLogosPresent } from "@/lib/ai/openai-images";
import { mockPosterSvg, sleep } from "@/lib/ai/mock";
import { isMockImages } from "@/lib/config";
import { nowIso } from "@/lib/utils/dates";
import { ALL_FORMATS, type OutputFormat } from "@/types/marketing";

export const maxDuration = 300;

/**
 * Runs poster generation for a job, one format at a time, updating the job
 * record incrementally so the client can poll live progress.
 * Body: { jobId: string, formats?: OutputFormat[] }  (formats = regenerate subset)
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const jobId = body?.jobId as string | undefined;
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.kind !== "image") return NextResponse.json({ error: "Not an image job" }, { status: 400 });

  const requested = (body?.formats as OutputFormat[] | undefined)?.filter((f) =>
    (ALL_FORMATS as string[]).includes(f)
  );
  const formats = requested?.length ? requested : job.formats;
  const mock = isMockImages();

  await patchJob(jobId, (j) => ({
    ...j,
    status: "generating",
    startedAt: j.startedAt ?? nowIso(),
    error: undefined,
    outputs: j.outputs.map((o) =>
      formats.includes(o.format) ? { ...o, status: "pending", error: undefined } : o
    ),
  }));

  for (const format of formats) {
    await patchJob(jobId, (j) => ({
      ...j,
      outputs: j.outputs.map((o) => (o.format === format ? { ...o, status: "generating" } : o)),
    }));

    try {
      let relPath: string;
      if (mock) {
        await sleep(1400); // let the live progress UI breathe
        relPath = `marketing/outputs/${jobId}/${format}.svg`;
        await writeOutput(relPath, mockPosterSvg({ format, ...job }));
      } else {
        const prompt = await composePosterPrompt(job, format, brandLogosPresent());
        const png = await generatePoster({ prompt, format, assetPaths: job.assetPaths });
        relPath = `marketing/outputs/${jobId}/${format}.png`;
        await writeOutput(relPath, png);
      }
      await patchJob(jobId, (j) => ({
        ...j,
        outputs: j.outputs.map((o) =>
          o.format === format ? { ...o, status: "done", path: relPath } : o
        ),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      await patchJob(jobId, (j) => ({
        ...j,
        outputs: j.outputs.map((o) =>
          o.format === format ? { ...o, status: "failed", error: message } : o
        ),
      }));
    }
  }

  const finished = await patchJob(jobId, (j) => {
    const anyDone = j.outputs.some((o) => o.status === "done");
    const firstError = j.outputs.find((o) => o.status === "failed")?.error;
    return {
      ...j,
      status: anyDone ? "ready" : "failed",
      error: anyDone ? undefined : firstError ?? "All formats failed",
      completedAt: nowIso(),
    };
  });

  return NextResponse.json({ job: finished });
}
