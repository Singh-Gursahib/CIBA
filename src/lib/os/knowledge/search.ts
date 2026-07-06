import { DOCS, type KnowledgeDoc } from "./docs";

export const listDocs = (): KnowledgeDoc[] => DOCS;
export const getDoc = (slug: string): KnowledgeDoc | undefined => DOCS.find((d) => d.slug === slug);
export const countDocs = (): number => DOCS.length;

const byTitle = (title: string): KnowledgeDoc | undefined => DOCS.find((d) => d.title.toLowerCase() === title.toLowerCase().trim());

/** [[wikilink]] titles referenced in a doc. */
function outgoingTitles(doc: KnowledgeDoc): string[] {
  return [...doc.content.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
}

export function getLinks(slug: string): { outgoing: KnowledgeDoc[]; backlinks: KnowledgeDoc[] } {
  const doc = getDoc(slug);
  if (!doc) return { outgoing: [], backlinks: [] };
  const outgoing = outgoingTitles(doc).map(byTitle).filter((d): d is KnowledgeDoc => Boolean(d));
  const backlinks = DOCS.filter((d) => d.slug !== slug && outgoingTitles(d).some((t) => byTitle(t)?.slug === slug));
  return { outgoing: [...new Set(outgoing)], backlinks };
}

/** Render [[Title]] wikilinks to markdown links to the doc viewer. */
export function resolveWikilinks(markdown: string): string {
  return markdown.replace(/\[\[([^\]]+)\]\]/g, (_m, title: string) => {
    const d = byTitle(title);
    return d ? `[${title}](/os/knowledge/docs/${d.slug})` : title;
  });
}

export function searchDocs(query: string, limit = 8): { doc: KnowledgeDoc; snippet: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return DOCS.map((doc) => ({ doc, snippet: doc.summary }));
  const words = q.split(/\s+/).filter(Boolean);
  const score = (doc: KnowledgeDoc) => {
    const title = doc.title.toLowerCase();
    const tags = doc.tags.join(" ").toLowerCase();
    const body = doc.content.toLowerCase();
    return words.reduce((n, w) => n + (title.includes(w) ? 3 : 0) + (tags.includes(w) ? 2 : 0) + (body.includes(w) ? 1 : 0), 0);
  };
  return DOCS.map((doc) => ({ doc, s: score(doc) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ doc }) => {
      const idx = doc.content.toLowerCase().indexOf(words[0]);
      const snippet = idx >= 0 ? "…" + doc.content.slice(Math.max(0, idx - 40), idx + 120).replace(/[#\n]/g, " ").trim() + "…" : doc.summary;
      return { doc, snippet };
    });
}
