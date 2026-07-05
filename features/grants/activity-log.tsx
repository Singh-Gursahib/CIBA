"use client";

import { useState } from "react";
import { ChevronDown, AlertCircle, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { History } from "lucide-react";
import { friendlyDateTime } from "@/lib/utils/dates";
import type { ScanLogEntry } from "@/types/grants";
import { cn } from "@/lib/utils/cn";

export function ActivityLog({ entries }: { entries: ScanLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<History />}
        title="No scans yet"
        description="Each time you scan for grants, a full record is kept here: which funders were checked, what was found, and what was new."
        className="py-20"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <LogRow key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}

function LogRow({ entry }: { entry: ScanLogEntry }) {
  const [open, setOpen] = useState(false);
  const duration = Math.max(
    1,
    Math.round((new Date(entry.finishedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000)
  );
  const totalFound = entry.orgsChecked.reduce((n, o) => n + o.found, 0);
  const errors = entry.orgsChecked.filter((o) => o.error).length;

  return (
    <Card>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-4 px-5 py-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[13px] text-ink">{friendlyDateTime(entry.startedAt)}</p>
          <p className="text-xs text-ink-faint">
            {entry.orgsChecked.length} funders · {totalFound} found ·{" "}
            <span className={entry.newDiscoveryIds.length ? "font-medium text-amber" : ""}>
              {entry.newDiscoveryIds.length} new
            </span>{" "}
            · {duration}s
            {errors > 0 && <span className="text-clay"> · {errors} error{errors === 1 ? "" : "s"}</span>}
          </p>
        </div>
        <ChevronDown className={cn("size-4 text-ink-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-line px-5 py-4 animate-fade-in">
          <ul className="space-y-1.5">
            {entry.orgsChecked.map((o) => (
              <li key={o.orgId} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 text-ink">
                  {o.error && <AlertCircle className="size-3.5 text-clay" />}
                  {o.orgName}
                </span>
                <span className="text-ink-faint">
                  {o.error ? (
                    <span className="text-clay">{o.error}</span>
                  ) : (
                    <>
                      {o.found} found{o.isNew ? <span className="text-amber"> · {o.isNew} new</span> : null}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {entry.searchQueries.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                <Search className="size-3.5" /> Search queries
              </p>
              <div className="flex flex-wrap gap-1.5">
                {entry.searchQueries.map((q, i) => (
                  <span key={i} className="rounded bg-surface-tint px-2 py-0.5 font-mono text-[11px] text-ink-soft">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
