import "server-only";
import { loadDocs } from "./loader";
import type { DocMeta } from "@/types/knowledge";

/** Lightweight doc list (no bodies) for graph panels, quick-open, and dashboards. */
export async function listDocMeta(): Promise<DocMeta[]> {
  const docs = await loadDocs();
  return docs.map(({ content: _c, ...m }) => m);
}

export async function countDocs(): Promise<number> {
  return (await loadDocs()).length;
}
