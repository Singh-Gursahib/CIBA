"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/utils/dates";
import type { ProposalMeta } from "@/types/grants";

const STATUS_TONE = { draft: "amber", in_review: "river", exported: "sage" } as const;
const STATUS_LABEL = { draft: "Draft", in_review: "In review", exported: "Exported" } as const;

export function ProposalsList({ proposals }: { proposals: ProposalMeta[] }) {
  if (proposals.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title="No proposals yet"
        description="Analyze a grant's fit, then start a proposal. Generated drafts appear here."
        className="py-20"
      />
    );
  }

  return (
    <Card>
      <ul className="divide-y divide-line">
        {proposals.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/grants/proposals/${p.slug}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-tint"
            >
              <FileText className="size-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{p.title}</p>
                <p className="truncate text-xs text-ink-faint">
                  {p.orgName ? `${p.orgName} · ` : ""}
                  {p.grantTitle} · updated {relativeTime(p.updatedAt)}
                </p>
              </div>
              <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
