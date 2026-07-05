// Persisted Social Studio posts — .data/social-posts.json. Seed arrays in the
// OS are immutable, so real content records live here (à la connectors/tokens.ts).
// Reads/writes are serialized through a per-file promise chain so concurrent
// render/publish patches never interleave.

import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./config";
import type { StudioPost } from "./types";

const FILE = path.join(DATA_DIR, "social-posts.json");
let chain: Promise<unknown> = Promise.resolve();

async function readAll(): Promise<StudioPost[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as StudioPost[];
  } catch {
    return [];
  }
}

async function writeAll(posts: StudioPost[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(posts, null, 2));
  await fs.rename(tmp, FILE);
}

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function listPosts(): Promise<StudioPost[]> {
  const posts = await readAll();
  return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPost(id: string): Promise<StudioPost | undefined> {
  return (await readAll()).find((p) => p.id === id);
}

export async function insertPost(post: StudioPost): Promise<void> {
  await serialize(async () => {
    const posts = await readAll();
    posts.push(post);
    await writeAll(posts);
  });
}

export async function patchPost(
  id: string,
  patch: Partial<StudioPost> | ((post: StudioPost) => StudioPost),
): Promise<StudioPost | undefined> {
  return serialize(async () => {
    const posts = await readAll();
    let result: StudioPost | undefined;
    const next = posts.map((p) => {
      if (p.id !== id) return p;
      result = typeof patch === "function" ? patch(p) : { ...p, ...patch };
      return result;
    });
    await writeAll(next);
    return result;
  });
}

export async function deletePost(id: string): Promise<void> {
  await serialize(async () => {
    const posts = (await readAll()).filter((p) => p.id !== id);
    await writeAll(posts);
  });
}
