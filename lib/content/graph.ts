import "server-only";
import { loadDocs } from "./loader";
import { extractWikiTargets, resolveWikiTarget } from "./wikilinks";
import type { DocMeta, GraphData } from "@/types/knowledge";

/** Build graph nodes/edges from the doc corpus by resolving wikilinks. */
export async function buildGraph(): Promise<GraphData> {
  const docs = await loadDocs();
  const meta: DocMeta[] = docs.map(({ content: _c, ...m }) => m);

  const edgeWeights = new Map<string, number>(); // "a→b" (a<b) → weight
  const degree = new Map<string, number>(docs.map((d) => [d.slug, 0]));

  for (const doc of docs) {
    const seen = new Set<string>();
    for (const target of extractWikiTargets(doc.content)) {
      const resolved = resolveWikiTarget(target, meta);
      if (!resolved || resolved.slug === doc.slug) continue;
      const [a, b] = [doc.slug, resolved.slug].sort();
      const key = `${a}→${b}`;
      if (seen.has(key)) {
        edgeWeights.set(key, (edgeWeights.get(key) ?? 1) + 1);
      } else {
        seen.add(key);
        edgeWeights.set(key, (edgeWeights.get(key) ?? 0) + 1);
      }
    }
  }

  const edges = [...edgeWeights.entries()].map(([key, weight]) => {
    const [source, target] = key.split("→");
    degree.set(source, (degree.get(source) ?? 0) + 1);
    degree.set(target, (degree.get(target) ?? 0) + 1);
    return { source, target, weight };
  });

  const nodes = docs.map((d) => ({
    id: d.slug,
    label: d.title,
    kind: d.type,
    degree: degree.get(d.slug) ?? 0,
  }));

  return { nodes, edges };
}

/** Docs that link to the given slug (backlinks) and docs it links out to. */
export async function getLinks(slug: string): Promise<{ backlinks: DocMeta[]; outgoing: DocMeta[] }> {
  const docs = await loadDocs();
  const meta: DocMeta[] = docs.map(({ content: _c, ...m }) => m);
  const self = docs.find((d) => d.slug === slug);

  const outgoing: DocMeta[] = [];
  if (self) {
    const seen = new Set<string>();
    for (const target of extractWikiTargets(self.content)) {
      const r = resolveWikiTarget(target, meta);
      if (r && r.slug !== slug && !seen.has(r.slug)) {
        seen.add(r.slug);
        outgoing.push(r);
      }
    }
  }

  const backlinks: DocMeta[] = [];
  for (const doc of docs) {
    if (doc.slug === slug) continue;
    const targets = extractWikiTargets(doc.content).map((t) => resolveWikiTarget(t, meta)?.slug);
    if (targets.includes(slug)) {
      const { content: _c, ...m } = doc;
      backlinks.push(m);
    }
  }

  return { backlinks, outgoing };
}
