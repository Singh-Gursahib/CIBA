import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/os/social/config";
import type { MarketingJob, MarketingVideoJob } from "./types";

const FILE = path.join(DATA_DIR, "marketing", "jobs.json");
const VIDEO_FILE = path.join(DATA_DIR, "marketing", "video-jobs.json");
let chain: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.then(() => undefined, () => undefined);
  return next;
}
async function readAll(): Promise<MarketingJob[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as MarketingJob[];
  } catch {
    return [];
  }
}
async function writeAll(jobs: MarketingJob[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(jobs, null, 2));
  await fs.rename(tmp, FILE);
}

export async function listJobs(): Promise<MarketingJob[]> {
  const jobs = await readAll();
  return [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function insertJob(job: MarketingJob): Promise<void> {
  await serialize(async () => {
    const jobs = await readAll();
    jobs.push(job);
    await writeAll(jobs);
  });
}
export async function deleteJob(id: string): Promise<void> {
  await serialize(async () => {
    await writeAll((await readAll()).filter((j) => j.id !== id));
  });
}

// --- Video jobs (same JSON-persisted, serialized pattern) ---

async function readAllVideos(): Promise<MarketingVideoJob[]> {
  try {
    return JSON.parse(await fs.readFile(VIDEO_FILE, "utf8")) as MarketingVideoJob[];
  } catch {
    return [];
  }
}
async function writeAllVideos(jobs: MarketingVideoJob[]): Promise<void> {
  await fs.mkdir(path.dirname(VIDEO_FILE), { recursive: true });
  const tmp = `${VIDEO_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(jobs, null, 2));
  await fs.rename(tmp, VIDEO_FILE);
}

export async function listVideoJobs(): Promise<MarketingVideoJob[]> {
  const jobs = await readAllVideos();
  return [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getVideoJob(id: string): Promise<MarketingVideoJob | undefined> {
  return (await readAllVideos()).find((j) => j.id === id);
}
export async function insertVideoJob(job: MarketingVideoJob): Promise<void> {
  await serialize(async () => {
    const jobs = await readAllVideos();
    jobs.push(job);
    await writeAllVideos(jobs);
  });
}
export async function updateVideoJob(
  id: string,
  patch: Partial<MarketingVideoJob>,
): Promise<MarketingVideoJob | undefined> {
  return serialize(async () => {
    const jobs = await readAllVideos();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return undefined;
    jobs[idx] = { ...jobs[idx], ...patch, id: jobs[idx].id };
    await writeAllVideos(jobs);
    return jobs[idx];
  });
}
export async function deleteVideoJob(id: string): Promise<void> {
  await serialize(async () => {
    await writeAllVideos((await readAllVideos()).filter((j) => j.id !== id));
  });
}
