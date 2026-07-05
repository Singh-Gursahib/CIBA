import "server-only";
import { loadDocs } from "./loader";
import type { DocType } from "@/types/knowledge";

export interface SearchHit {
  slug: string;
  title: string;
  type: DocType;
  snippet: string;
}

/**
 * Keyword search over title + tags + body. Ported from the FirstResponders
 * search_notes tool: token OR-match, snippet around the first hit, top N.
 */
export async function searchDocs(query: string, limit = 6): Promise<SearchHit[]> {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const docs = await loadDocs();
  const scored: (SearchHit & { score: number })[] = [];

  for (const doc of docs) {
    const hay = `${doc.title}\n${doc.tags.join(" ")}\n${doc.summary}\n${doc.content}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (doc.title.toLowerCase().includes(t)) score += 3;
      if (doc.tags.some((tag) => tag.toLowerCase().includes(t))) score += 2;
      if (hay.includes(t)) score += 1;
    }
    if (score === 0) continue;

    const clean = doc.content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, t, a) => a || t);
    const firstToken = tokens.find((t) => clean.toLowerCase().includes(t)) ?? tokens[0];
    const idx = Math.max(0, clean.toLowerCase().indexOf(firstToken));
    const snippet = clean
      .slice(Math.max(0, idx - 80), idx + 180)
      .replace(/[#*`>]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    scored.push({ slug: doc.slug, title: doc.title, type: doc.type, snippet, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _s, ...hit }) => hit);
}
