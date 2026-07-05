"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { DATA_DIR } from "@/lib/config";
import { nowIso } from "@/lib/utils/dates";
import { insertJob } from "@/features/marketing/data";
import { videoProvider } from "@/lib/video/provider";
import {
  ALL_FORMATS,
  type MarketingJob,
  type OutputFormat,
  type VideoFormat,
} from "@/types/marketing";

const MAX_ASSETS = 6;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function saveUploads(jobId: string, files: File[]): Promise<string[]> {
  const dir = path.join(DATA_DIR, "marketing", "uploads", jobId);
  await fs.mkdir(dir, { recursive: true });
  const relPaths: string[] = [];
  for (const [i, file] of files.entries()) {
    if (!ALLOWED_TYPES.has(file.type) || file.size === 0 || file.size > MAX_ASSET_BYTES) continue;
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const name = `asset-${i + 1}.${ext}`;
    await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    relPaths.push(`marketing/uploads/${jobId}/${name}`);
  }
  return relPaths;
}

export async function createPosterJob(formData: FormData): Promise<{ jobId: string } | { error: string }> {
  const brief = String(formData.get("brief") ?? "").trim();
  const formats = formData
    .getAll("formats")
    .map(String)
    .filter((f): f is OutputFormat => (ALL_FORMATS as string[]).includes(f));
  const files = formData.getAll("assets").filter((f): f is File => f instanceof File && f.size > 0);

  if (!brief) return { error: "Describe the event or announcement first." };
  if (formats.length === 0) return { error: "Choose at least one output format." };
  if (files.length > MAX_ASSETS) return { error: `Up to ${MAX_ASSETS} assets are supported.` };

  const jobId = newId();
  const assetPaths = await saveUploads(jobId, files);

  const job: MarketingJob = {
    id: jobId,
    kind: "image",
    brief,
    eventName: String(formData.get("eventName") ?? "").trim() || undefined,
    eventDetails: String(formData.get("eventDetails") ?? "").trim() || undefined,
    cta: String(formData.get("cta") ?? "").trim() || undefined,
    assetPaths,
    formats,
    status: "queued",
    outputs: formats.map((format) => ({ format, path: "", status: "pending" })),
    createdAt: nowIso(),
  };

  await insertJob(job);
  revalidatePath("/marketing");
  return { jobId };
}

export async function createVideoJob(formData: FormData): Promise<{ jobId: string } | { error: string }> {
  const brief = String(formData.get("brief") ?? "").trim();
  if (!brief) return { error: "Describe the event or announcement first." };

  const files = formData.getAll("assets").filter((f): f is File => f instanceof File && f.size > 0);
  const videoFormat = (String(formData.get("videoFormat")) === "vertical" ? "vertical" : "landscape") as VideoFormat;
  const duration = Number(formData.get("duration")) || 15;

  const jobId = newId();
  const assetPaths = await saveUploads(jobId, files.slice(0, MAX_ASSETS));

  const job: MarketingJob = {
    id: jobId,
    kind: "video",
    brief,
    eventName: String(formData.get("eventName") ?? "").trim() || undefined,
    assetPaths,
    formats: [],
    videoFormat,
    durationSeconds: Math.min(20, Math.max(10, duration)),
    status: "generating",
    outputs: [],
    createdAt: nowIso(),
    startedAt: nowIso(),
  };

  await insertJob(job);
  await videoProvider.start(job);
  revalidatePath("/marketing");
  return { jobId };
}
