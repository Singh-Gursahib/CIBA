// Grants persistence in .data/ — discoveries, scan log, and proposals (index +
// per-slug markdown + answers + version snapshots). Serialized writes, atomic
// tmp+rename, matching the social store.

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { DATA_DIR } from "@/lib/os/social/config";
import type { Discovery, ProposalMeta, ScanLogEntry } from "./types";

const DISCOVERIES = path.join(DATA_DIR, "grants", "discoveries.json");
const SCANLOG = path.join(DATA_DIR, "grants", "scan-log.json");
const PROP_INDEX = path.join(DATA_DIR, "proposals", "index.json");
const propDir = (slug: string) => path.join(DATA_DIR, "proposals", slug);

let chain: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.then(() => undefined, () => undefined);
  return next;
}
async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}
async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

/** Stable dedup id for a discovery. */
export function discoveryId(orgId: string, title: string): string {
  const norm = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return createHash("sha1").update(`${orgId}:${norm}`).digest("hex").slice(0, 16);
}

// ---- discoveries ----
export async function listDiscoveries(): Promise<Discovery[]> {
  const all = await readJson<Discovery[]>(DISCOVERIES, []);
  return [...all].sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));
}
export async function getDiscovery(id: string): Promise<Discovery | undefined> {
  return (await readJson<Discovery[]>(DISCOVERIES, [])).find((d) => d.id === id);
}
/** Insert only genuinely new discoveries; returns the fresh ones. */
export async function upsertDiscoveries(candidates: Omit<Discovery, "firstSeenAt" | "status">[], seenAt: string): Promise<Discovery[]> {
  return serialize(async () => {
    const all = await readJson<Discovery[]>(DISCOVERIES, []);
    const have = new Set(all.map((d) => d.id));
    const fresh: Discovery[] = [];
    for (const c of candidates) {
      if (have.has(c.id)) continue;
      have.add(c.id);
      const d: Discovery = { ...c, firstSeenAt: seenAt, status: "new" };
      all.push(d);
      fresh.push(d);
    }
    if (fresh.length) await writeJson(DISCOVERIES, all);
    return fresh;
  });
}
export async function patchDiscovery(id: string, patch: Partial<Discovery>): Promise<Discovery | undefined> {
  return serialize(async () => {
    const all = await readJson<Discovery[]>(DISCOVERIES, []);
    let result: Discovery | undefined;
    const next = all.map((d) => (d.id === id ? (result = { ...d, ...patch }) : d));
    await writeJson(DISCOVERIES, next);
    return result;
  });
}

// ---- scan log ----
export async function appendScanLog(entry: ScanLogEntry): Promise<void> {
  await serialize(async () => {
    const all = await readJson<ScanLogEntry[]>(SCANLOG, []);
    all.push(entry);
    await writeJson(SCANLOG, all.slice(-50));
  });
}
export async function listScanLog(): Promise<ScanLogEntry[]> {
  return (await readJson<ScanLogEntry[]>(SCANLOG, [])).reverse();
}

// ---- proposals ----
export async function listProposals(): Promise<ProposalMeta[]> {
  const all = await readJson<ProposalMeta[]>(PROP_INDEX, []);
  return [...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function getProposalMeta(slug: string): Promise<ProposalMeta | undefined> {
  return (await readJson<ProposalMeta[]>(PROP_INDEX, [])).find((p) => p.slug === slug);
}
export async function upsertProposalMeta(meta: ProposalMeta): Promise<void> {
  await serialize(async () => {
    const all = await readJson<ProposalMeta[]>(PROP_INDEX, []);
    const i = all.findIndex((p) => p.slug === meta.slug);
    if (i === -1) all.push(meta);
    else all[i] = meta;
    await writeJson(PROP_INDEX, all);
  });
}
export async function touchProposal(slug: string, patch: Partial<ProposalMeta> = {}): Promise<void> {
  await serialize(async () => {
    const all = await readJson<ProposalMeta[]>(PROP_INDEX, []);
    const i = all.findIndex((p) => p.slug === slug);
    if (i !== -1) all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
    await writeJson(PROP_INDEX, all);
  });
}
export async function saveProposalDoc(slug: string, markdown: string): Promise<void> {
  await fs.mkdir(propDir(slug), { recursive: true });
  await fs.writeFile(path.join(propDir(slug), "proposal.md"), markdown);
}
export async function readProposalDoc(slug: string): Promise<string> {
  try {
    return await fs.readFile(path.join(propDir(slug), "proposal.md"), "utf8");
  } catch {
    return "";
  }
}
export async function saveProposalAnswers(slug: string, answers: Record<string, string>): Promise<void> {
  await fs.mkdir(propDir(slug), { recursive: true });
  await writeJson(path.join(propDir(slug), "answers.json"), answers);
}

// ---- versions ----
export async function snapshotProposal(slug: string): Promise<void> {
  const md = await readProposalDoc(slug);
  if (!md) return;
  const dir = path.join(propDir(slug), "versions");
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await fs.writeFile(path.join(dir, `${stamp}.md`), md);
  // keep the latest 20
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  for (const f of files.slice(0, Math.max(0, files.length - 20))) {
    await fs.rm(path.join(dir, f), { force: true });
  }
}
export async function listProposalVersions(slug: string): Promise<{ id: string; savedAt: string }[]> {
  try {
    const dir = path.join(propDir(slug), "versions");
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort().reverse();
    return files.map((f) => {
      const id = f.replace(/\.md$/, "");
      return { id, savedAt: id.replace(/-/g, (m, i) => ([4, 7].includes(i) ? "-" : [13, 16].includes(i) ? ":" : m)) };
    });
  } catch {
    return [];
  }
}
export async function readProposalVersion(slug: string, id: string): Promise<string> {
  const safe = id.replace(/[^0-9A-Za-z-]/g, "");
  try {
    return await fs.readFile(path.join(propDir(slug), "versions", `${safe}.md`), "utf8");
  } catch {
    return "";
  }
}
