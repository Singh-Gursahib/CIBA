import "server-only";
import { promises as fs } from "fs";
import path from "path";
import matter from "gray-matter";
import { CONTENT_DIR } from "@/lib/config";
import { slugify } from "@/lib/utils/slugify";
import type { DocType, KnowledgeDoc } from "@/types/knowledge";

let cache: { docs: KnowledgeDoc[]; loadedAt: number } | null = null;
const CACHE_MS = process.env.NODE_ENV === "production" ? 60_000 : 1_000;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

export async function loadDocs(): Promise<KnowledgeDoc[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_MS) return cache.docs;

  const files = await walk(CONTENT_DIR);
  const docs: KnowledgeDoc[] = [];
  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const { data, content } = matter(raw);
    const base = path.basename(file, ".md");
    const title = (data.title as string) || base;
    docs.push({
      slug: (data.slug as string) || slugify(title),
      title,
      type: ((data.type as DocType) || "internal") as DocType,
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
      date: (data.date && String(data.date)) || "",
      status: (data.status as string) || "",
      summary: (data.summary as string) || "",
      content: content.trim(),
    });
  }
  docs.sort((a, b) => a.title.localeCompare(b.title));
  cache = { docs, loadedAt: Date.now() };
  return docs;
}

export async function getDoc(slug: string): Promise<KnowledgeDoc | undefined> {
  const docs = await loadDocs();
  return docs.find((d) => d.slug === slug);
}
