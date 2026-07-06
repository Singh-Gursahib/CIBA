import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowUpRight, CornerDownRight } from "lucide-react";
import { currentMember } from "@/lib/os/auth";
import { getDoc, getLinks, resolveWikilinks } from "@/lib/os/knowledge/search";
import { Badge } from "@/components/ui";

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  await currentMember();
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();
  const { outgoing, backlinks } = getLinks(slug);
  const md = resolveWikilinks(doc.content);

  return (
    <div className="space-y-5">
      <Link href="/os/knowledge" className="btn btn-ghost !py-1.5 !px-3 text-xs"><ArrowLeft className="w-3.5 h-3.5" /> Knowledge</Link>
      <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="card p-7">
          <div className="flex items-center gap-2 mb-3">
            <Badge tone="brand">{doc.type}</Badge>
            <span className="text-[11px] text-muted">Updated {doc.updated}</span>
          </div>
          <div className="[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-brand-ink [&_h2]:mt-5 [&_h2]:mb-2 [&_p]:text-sm [&_p]:text-ink/85 [&_p]:my-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:space-y-1 [&_li]:text-ink/85 [&_a]:text-brand [&_a]:underline [&_strong]:font-semibold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /> Links out</p>
            {outgoing.length === 0 ? <p className="text-xs text-muted">None</p> : outgoing.map((d) => <Link key={d.slug} href={`/os/knowledge/docs/${d.slug}`} className="block text-sm text-brand hover:underline py-0.5">{d.title}</Link>)}
          </div>
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2 flex items-center gap-1"><CornerDownRight className="w-3.5 h-3.5" /> Linked from</p>
            {backlinks.length === 0 ? <p className="text-xs text-muted">None</p> : backlinks.map((d) => <Link key={d.slug} href={`/os/knowledge/docs/${d.slug}`} className="block text-sm text-brand hover:underline py-0.5">{d.title}</Link>)}
          </div>
        </div>
      </div>
    </div>
  );
}
