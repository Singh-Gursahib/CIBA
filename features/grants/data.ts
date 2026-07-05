import "server-only";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/config";
import { readJson, updateJson, writeJson } from "@/lib/store/json";
import { nowIso } from "@/lib/utils/dates";
import type {
  Discovery,
  FitAnalysis,
  FundingOrg,
  ProposalMeta,
  ScanLogEntry,
} from "@/types/grants";

const DISCOVERIES_FILE = "grants/discoveries.json";
const LOG_FILE = "grants/activity-log.json";

export async function listOrgs(): Promise<FundingOrg[]> {
  return readJson<FundingOrg[]>("grants/organizations.json", []);
}

export function discoveryId(orgId: string, title: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return createHash("sha1").update(`${orgId}:${normalized}`).digest("hex").slice(0, 16);
}

export async function listDiscoveries(): Promise<Discovery[]> {
  const all = await readJson<Discovery[]>(DISCOVERIES_FILE, []);
  return [...all].sort((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));
}

export async function listActivityLog(): Promise<ScanLogEntry[]> {
  const all = await readJson<ScanLogEntry[]>(LOG_FILE, []);
  return [...all].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** Merge scanned candidates; returns only the genuinely new ones (unseen id). */
export async function upsertDiscoveries(
  candidates: Omit<Discovery, "id" | "firstSeenAt" | "status">[],
  seenAt: string
): Promise<Discovery[]> {
  const fresh: Discovery[] = [];
  await updateJson<Discovery[]>(DISCOVERIES_FILE, [], (existing) => {
    const ids = new Set(existing.map((d) => d.id));
    const next = [...existing];
    for (const c of candidates) {
      const id = discoveryId(c.orgId, c.title);
      if (ids.has(id)) continue;
      ids.add(id);
      const record: Discovery = { ...c, id, firstSeenAt: seenAt, status: "new" };
      next.push(record);
      fresh.push(record);
    }
    return next;
  });
  return fresh;
}

export async function appendScanLog(entry: ScanLogEntry): Promise<void> {
  await updateJson<ScanLogEntry[]>(LOG_FILE, [], (log) => [...log, entry]);
}

export async function lastScanAt(): Promise<string | null> {
  const log = await listActivityLog();
  return log[0]?.startedAt ?? null;
}

export async function patchDiscovery(
  id: string,
  patch: Partial<Discovery>
): Promise<Discovery | undefined> {
  let result: Discovery | undefined;
  await updateJson<Discovery[]>(DISCOVERIES_FILE, [], (all) =>
    all.map((d) => (d.id === id ? (result = { ...d, ...patch }) : d))
  );
  return result;
}

export async function setDiscoveryFit(id: string, fit: FitAnalysis): Promise<void> {
  await patchDiscovery(id, { fit });
}

export async function getDiscovery(id: string): Promise<Discovery | undefined> {
  const all = await readJson<Discovery[]>(DISCOVERIES_FILE, []);
  return all.find((d) => d.id === id);
}

/** Mark previously-new discoveries as seen once the user has viewed the feed. */
export async function markAllSeen(): Promise<void> {
  await updateJson<Discovery[]>(DISCOVERIES_FILE, [], (all) =>
    all.map((d) => (d.status === "new" ? { ...d, status: "seen" } : d))
  );
}

// ---- Proposals index ----

const PROPOSALS_INDEX = "proposals/index.json";

export async function listProposals(): Promise<ProposalMeta[]> {
  const all = await readJson<ProposalMeta[]>(PROPOSALS_INDEX, []);
  return [...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertProposalMeta(meta: ProposalMeta): Promise<void> {
  await updateJson<ProposalMeta[]>(PROPOSALS_INDEX, [], (all) => {
    const idx = all.findIndex((p) => p.slug === meta.slug);
    if (idx === -1) return [...all, meta];
    const next = [...all];
    next[idx] = meta;
    return next;
  });
}

export async function saveProposalDoc(slug: string, markdown: string): Promise<void> {
  const dir = path.join(DATA_DIR, "proposals", slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "proposal.md"), markdown, "utf8");
}

export async function readProposalDoc(slug: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(DATA_DIR, "proposals", slug, "proposal.md"), "utf8");
  } catch {
    return null;
  }
}

export async function getProposalMeta(slug: string): Promise<ProposalMeta | undefined> {
  const all = await readJson<ProposalMeta[]>(PROPOSALS_INDEX, []);
  return all.find((p) => p.slug === slug);
}

export async function touchProposal(slug: string): Promise<void> {
  await updateJson<ProposalMeta[]>(PROPOSALS_INDEX, [], (all) =>
    all.map((p) => (p.slug === slug ? { ...p, updatedAt: nowIso() } : p))
  );
}

/** Snapshot the current proposal into versions/, keeping the latest 20. */
export async function snapshotProposal(slug: string): Promise<void> {
  const current = await readProposalDoc(slug);
  if (!current) return;
  const dir = path.join(DATA_DIR, "proposals", slug, "versions");
  await fs.mkdir(dir, { recursive: true });
  const stamp = nowIso().replace(/[:.]/g, "-");
  await fs.writeFile(path.join(dir, `${stamp}.md`), current, "utf8");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  for (const old of files.slice(0, Math.max(0, files.length - 20))) {
    await fs.rm(path.join(dir, old)).catch(() => {});
  }
}

export interface ProposalVersion {
  id: string;
  savedAt: string;
}

/** Recover an ISO timestamp from a version stamp like 2026-07-03T06-51-51-990Z. */
function stampToIso(stamp: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/.exec(stamp);
  return m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z` : stamp;
}

export async function listProposalVersions(slug: string): Promise<ProposalVersion[]> {
  const dir = path.join(DATA_DIR, "proposals", slug, "versions");
  try {
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
    return files
      .map((f) => {
        const id = f.replace(/\.md$/, "");
        return { id, savedAt: stampToIso(id) };
      })
      .sort((a, b) => b.id.localeCompare(a.id));
  } catch {
    return [];
  }
}

export async function readProposalVersion(slug: string, id: string): Promise<string | null> {
  const safe = id.replace(/[^0-9A-Za-z-]/g, "");
  try {
    return await fs.readFile(path.join(DATA_DIR, "proposals", slug, "versions", `${safe}.md`), "utf8");
  } catch {
    return null;
  }
}

export async function saveProposalAnswers(
  slug: string,
  answers: Record<string, string>
): Promise<void> {
  await writeJson(`proposals/${slug}/answers.json`, answers);
}
