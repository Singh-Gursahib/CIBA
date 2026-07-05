import "server-only";
import { readJson, updateJson } from "@/lib/store/json";
import type { MarketingJob } from "@/types/marketing";

const JOBS_FILE = "marketing/jobs.json";

export async function listJobs(): Promise<MarketingJob[]> {
  const jobs = await readJson<MarketingJob[]>(JOBS_FILE, []);
  return [...jobs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getJob(id: string): Promise<MarketingJob | undefined> {
  const jobs = await readJson<MarketingJob[]>(JOBS_FILE, []);
  return jobs.find((j) => j.id === id);
}

export async function insertJob(job: MarketingJob): Promise<void> {
  await updateJson<MarketingJob[]>(JOBS_FILE, [], (jobs) => [...jobs, job]);
}

export async function patchJob(
  id: string,
  patch: Partial<MarketingJob> | ((job: MarketingJob) => MarketingJob)
): Promise<MarketingJob | undefined> {
  let result: MarketingJob | undefined;
  await updateJson<MarketingJob[]>(JOBS_FILE, [], (jobs) =>
    jobs.map((j) => {
      if (j.id !== id) return j;
      result = typeof patch === "function" ? patch(j) : { ...j, ...patch };
      return result;
    })
  );
  return result;
}
