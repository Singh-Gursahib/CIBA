import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/os/social/config";
import type { MarketingJob } from "./types";

const FILE = path.join(DATA_DIR, "marketing", "jobs.json");
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
