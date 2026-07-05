import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/config";

/**
 * Tiny JSON persistence over the data/ directory.
 * Atomic writes (tmp + rename) and a per-file in-process queue so
 * concurrent route handlers never interleave read-modify-write cycles.
 */

const queues = new Map<string, Promise<unknown>>();

function resolveDataPath(relPath: string): string {
  const abs = path.resolve(DATA_DIR, relPath);
  if (!abs.startsWith(DATA_DIR + path.sep)) {
    throw new Error(`Path escapes data directory: ${relPath}`);
  }
  return abs;
}

export async function readJson<T>(relPath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(resolveDataPath(relPath), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(relPath: string, data: unknown): Promise<void> {
  const abs = resolveDataPath(relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const tmp = `${abs}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, abs);
}

/** Serialized read-modify-write. All mutations of a given file should go through this. */
export async function updateJson<T>(
  relPath: string,
  fallback: T,
  mutate: (current: T) => T | Promise<T>
): Promise<T> {
  const prev = queues.get(relPath) ?? Promise.resolve();
  const next = prev.then(async () => {
    const current = await readJson<T>(relPath, fallback);
    const updated = await mutate(current);
    await writeJson(relPath, updated);
    return updated;
  });
  // Keep the chain alive even if this update throws
  queues.set(relPath, next.catch(() => undefined));
  return next;
}
