import type { DocMeta } from "@/types/knowledge";

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Extract raw wikilink targets from markdown. */
export function extractWikiTargets(markdown: string): string[] {
  const targets: string[] = [];
  for (const m of markdown.matchAll(WIKILINK_RE)) targets.push(m[1].trim());
  return targets;
}

/** Resolve a wikilink target to a doc slug by title, then filename, case-insensitively. */
export function resolveWikiTarget(target: string, docs: DocMeta[]): DocMeta | undefined {
  const t = target.trim().toLowerCase();
  return (
    docs.find((d) => d.title.toLowerCase() === t) ??
    docs.find((d) => d.slug.toLowerCase() === t) ??
    docs.find((d) => d.slug.toLowerCase() === t.replace(/\s+/g, "-"))
  );
}

/** Convert [[wikilinks]] into markdown links with a wiki: scheme for the renderer. */
export function preprocessWikilinks(markdown: string): string {
  return markdown.replace(WIKILINK_RE, (_m, target: string, alias?: string) => {
    const label = (alias || target).trim();
    return `[${label}](wiki:${encodeURIComponent(target.trim())})`;
  });
}
