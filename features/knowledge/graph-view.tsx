"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Maximize2 } from "lucide-react";
import { GraphCanvas } from "./graph-canvas";
import { NodePreview } from "./node-preview";
import { useGraph } from "./graph-store";
import { DOC_TYPE_META, type DocMeta, type DocType, type GraphData } from "@/types/knowledge";
import { cn } from "@/lib/utils/cn";

export function GraphView({ data, docs }: { data: GraphData; docs: DocMeta[] }) {
  const router = useRouter();
  const query = useGraph((s) => s.query);
  const setQuery = useGraph((s) => s.setQuery);
  const enabledKinds = useGraph((s) => s.enabledKinds);
  const toggleKind = useGraph((s) => s.toggleKind);
  const selectedId = useGraph((s) => s.selectedId);
  const select = useGraph((s) => s.select);
  const requestFit = useGraph((s) => s.requestFit);

  const usedKinds = useMemo(
    () => Array.from(new Set(data.nodes.map((n) => n.kind))) as DocType[],
    [data]
  );

  const resolveTitle = useMemo(() => {
    const byTitle = new Map(docs.map((d) => [d.title.toLowerCase(), d.slug]));
    return (target: string) => byTitle.get(target.trim().toLowerCase()) ?? null;
  }, [docs]);

  return (
    <div className="relative h-[calc(100vh-13rem)] min-h-[520px] overflow-hidden rounded-xl border border-line bg-[radial-gradient(circle_at_center,#ffffff,#f4f2ee)]">
      <GraphCanvas data={data} onOpen={(slug) => router.push(`/knowledge/docs/${slug}`)} />

      {/* Search — top left */}
      <div className="absolute left-4 top-4 z-10 w-64">
        <div className="flex items-center gap-2 rounded-md border border-line bg-surface/85 px-3 py-2 shadow-1 backdrop-blur-md">
          <Search className="size-4 shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a document…"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
      </div>

      {/* Filters + fit — top right */}
      <div className="absolute right-4 top-4 z-10 flex max-w-[60%] flex-wrap items-center justify-end gap-1.5">
        {usedKinds.map((kind) => {
          const active = enabledKinds.has(kind);
          const meta = DOC_TYPE_META[kind];
          return (
            <button
              key={kind}
              onClick={() => toggleKind(kind)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium shadow-1 backdrop-blur-md transition-colors",
                active
                  ? "border-line bg-surface/85 text-ink"
                  : "border-transparent bg-surface/50 text-ink-faint line-through"
              )}
            >
              <span className="size-2 rounded-full" style={{ background: meta.color }} />
              {meta.label}
            </button>
          );
        })}
        <button
          onClick={requestFit}
          aria-label="Fit to view"
          className="flex size-7 items-center justify-center rounded-full border border-line bg-surface/85 text-ink-soft shadow-1 backdrop-blur-md hover:text-ink"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>

      {/* Count — bottom left */}
      <div className="absolute bottom-4 left-4 z-10 rounded-md border border-line bg-surface/85 px-3 py-1.5 font-mono text-[11px] text-ink-faint shadow-1 backdrop-blur-md">
        {data.nodes.length} documents · {data.edges.length} links
      </div>

      {selectedId && (
        <NodePreview
          slug={selectedId}
          onClose={() => select(null)}
          onNavigate={(slug) => select(slug)}
          resolveTitle={resolveTitle}
        />
      )}
    </div>
  );
}
