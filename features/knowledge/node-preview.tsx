"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ArrowUpRight, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { MarkdownView } from "./markdown";
import { DOC_TYPE_META, type DocMeta, type KnowledgeDoc } from "@/types/knowledge";
import { friendlyDate } from "@/lib/utils/dates";

interface PreviewPayload {
  doc: KnowledgeDoc;
  backlinks: DocMeta[];
}

export function NodePreview({
  slug,
  onClose,
  onNavigate,
  resolveTitle,
}: {
  slug: string;
  onClose: () => void;
  onNavigate: (slug: string) => void;
  resolveTitle: (target: string) => string | null;
}) {
  const [data, setData] = useState<PreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/knowledge/doc/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  const meta = data?.doc ? DOC_TYPE_META[data.doc.type] : null;

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-[min(90vw,380px)] flex-col border-l border-line bg-surface/95 shadow-2 backdrop-blur-md animate-fade-in">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-xs font-medium text-ink-faint">Document preview</span>
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-md p-1 text-ink-faint hover:bg-surface-tint hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : data?.doc ? (
          <>
            <div className="flex items-center gap-2">
              {meta && (
                <Badge tone="neutral" className="gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: meta.color }} />
                  {meta.label}
                </Badge>
              )}
              {data.doc.date && (
                <span className="font-mono text-[11px] text-ink-faint">
                  {friendlyDate(data.doc.date)}
                </span>
              )}
            </div>
            <h2 className="mt-2.5 font-display text-2xl leading-tight tracking-tight">
              {data.doc.title}
            </h2>
            {data.doc.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {data.doc.tags.map((t) => (
                  <span key={t} className="text-[11px] text-ink-faint">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 max-h-[38vh] overflow-hidden [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
              <MarkdownView
                content={data.doc.content.split("\n").slice(0, 24).join("\n")}
                onWikiLink={(target) => {
                  const resolved = resolveTitle(target);
                  if (resolved) onNavigate(resolved);
                }}
              />
            </div>

            {data.backlinks.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                  <Link2 className="size-3.5" /> Referenced by {data.backlinks.length}
                </p>
                <ul className="space-y-0.5">
                  {data.backlinks.map((b) => (
                    <li key={b.slug}>
                      <button
                        onClick={() => onNavigate(b.slug)}
                        className="text-[13px] text-river hover:underline"
                      >
                        {b.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-soft">Could not load this document.</p>
        )}
      </div>

      {data?.doc && (
        <div className="border-t border-line p-4">
          <Link
            href={`/knowledge/docs/${data.doc.slug}`}
            className="flex items-center justify-center gap-1.5 rounded-md bg-river px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-river-deep"
          >
            Open document
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      )}
    </aside>
  );
}
