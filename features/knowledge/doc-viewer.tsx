"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Link2, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarkdownView } from "./markdown";
import { DOC_TYPE_META, type DocMeta, type KnowledgeDoc } from "@/types/knowledge";
import { friendlyDate } from "@/lib/utils/dates";

export function DocViewer({
  doc,
  backlinks,
  outgoing,
  resolve,
}: {
  doc: KnowledgeDoc;
  backlinks: DocMeta[];
  outgoing: DocMeta[];
  resolve: Record<string, string>;
}) {
  const router = useRouter();
  const meta = DOC_TYPE_META[doc.type];

  const go = (target: string) => {
    const slug = resolve[target.trim().toLowerCase()];
    if (slug) router.push(`/knowledge/docs/${slug}`);
  };

  return (
    <div className="enter">
      <Link
        href="/knowledge"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-3.5" /> Back to graph
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1fr_240px]">
        <article>
          <div className="flex items-center gap-2.5">
            <Badge tone="neutral" className="gap-1.5">
              <span className="size-2 rounded-full" style={{ background: meta.color }} />
              {meta.label}
            </Badge>
            {doc.date && (
              <span className="font-mono text-xs text-ink-faint">{friendlyDate(doc.date)}</span>
            )}
            {doc.status && <Badge tone="river">{doc.status}</Badge>}
          </div>

          <h1 className="mt-3 font-display text-[40px] leading-[1.1] tracking-tight">{doc.title}</h1>
          {doc.summary && <p className="mt-2 text-[15px] text-ink-soft">{doc.summary}</p>}

          {doc.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {doc.tags.map((t) => (
                <span key={t} className="text-xs text-ink-faint">#{t}</span>
              ))}
            </div>
          )}

          <hr className="my-6 border-line" />

          <MarkdownView content={doc.content} onWikiLink={go} />
        </article>

        <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          {outgoing.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <ArrowUpRight className="size-3.5" /> Links to
              </h3>
              <ul className="space-y-1">
                {outgoing.map((d) => (
                  <li key={d.slug}>
                    <Link href={`/knowledge/docs/${d.slug}`} className="text-[13px] text-river hover:underline">
                      {d.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {backlinks.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <Link2 className="size-3.5" /> Referenced by
              </h3>
              <ul className="space-y-1">
                {backlinks.map((d) => (
                  <li key={d.slug}>
                    <Link href={`/knowledge/docs/${d.slug}`} className="text-[13px] text-river hover:underline">
                      {d.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
