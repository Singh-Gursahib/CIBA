"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Waypoints, Search, FileText } from "lucide-react";
import { PageHeader, Badge, type Tone } from "@/components/ui";

interface DocIndex {
  slug: string;
  title: string;
  type: string;
  tags: string[];
  summary: string;
  updated: string;
}

const TYPE_TONE: Record<string, Tone> = { playbook: "brand", program: "blue", partner: "amber", policy: "violet", reference: "gray" };
const TYPES = ["all", "playbook", "program", "partner", "policy", "reference"];

export function KnowledgeView({ docs }: { docs: DocIndex[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return docs.filter((d) => {
      if (type !== "all" && d.type !== type) return false;
      if (!query) return true;
      return (d.title + " " + d.tags.join(" ") + " " + d.summary).toLowerCase().includes(query);
    });
  }, [docs, q, type]);

  return (
    <div className="space-y-6 fade-up">
      <PageHeader title="Knowledge" subtitle="CIBA's internal reference base — programs, playbooks, funders, and policy. Linked and searchable." icon={<Waypoints />} />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="field pl-9" placeholder="Search the knowledge base…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition ${type === t ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-bg"}`}>{t}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">No documents match.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <Link key={d.slug} href={`/os/knowledge/docs/${d.slug}`} className="card p-5 block hover:-translate-y-0.5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between gap-2">
                <FileText className="w-4 h-4 text-brand" strokeWidth={1.75} />
                <Badge tone={TYPE_TONE[d.type] ?? "gray"}>{d.type}</Badge>
              </div>
              <p className="font-semibold mt-2">{d.title}</p>
              <p className="text-xs text-muted mt-1 line-clamp-2">{d.summary}</p>
              <div className="flex flex-wrap gap-1 mt-2">{d.tags.slice(0, 3).map((t) => <span key={t} className="text-[10px] text-muted">#{t}</span>)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
