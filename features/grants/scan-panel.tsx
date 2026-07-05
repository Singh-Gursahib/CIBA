"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { readNdjson } from "@/lib/use-ndjson";
import { useToast } from "@/components/ui/toast";
import type { FundingOrg } from "@/types/grants";
import { cn } from "@/lib/utils/cn";

interface OrgState {
  status: "pending" | "scanning" | "done" | "error";
  found?: number;
  isNew?: number;
  error?: string;
}

export function ScanPanel({
  orgs,
  lastScan,
}: {
  orgs: FundingOrg[];
  lastScan: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [scanning, setScanning] = useState(false);
  const [states, setStates] = useState<Record<string, OrgState>>({});
  const [done, setDone] = useState(0);

  const runScan = async () => {
    setScanning(true);
    setStates(Object.fromEntries(orgs.map((o) => [o.id, { status: "pending" as const }])));
    setDone(0);

    try {
      const res = await fetch("/api/grants/scan", { method: "POST" });
      await readNdjson(res, (ev) => {
        if (ev.type === "org_start") {
          setStates((s) => ({ ...s, [String(ev.orgId)]: { status: "scanning" } }));
        } else if (ev.type === "org_done") {
          setStates((s) => ({
            ...s,
            [String(ev.orgId)]: {
              status: ev.error ? "error" : "done",
              found: Number(ev.found ?? 0),
              isNew: Number(ev.isNew ?? 0),
              error: ev.error ? String(ev.error) : undefined,
            },
          }));
          setDone((d) => d + 1);
        } else if (ev.type === "scan_done") {
          const n = Number(ev.newCount ?? 0);
          toast(n > 0 ? "success" : "info", n > 0 ? `${n} new opportunit${n === 1 ? "y" : "ies"} found` : "No new opportunities this time");
        }
      });
      router.refresh();
    } catch {
      toast("error", "Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  const progress = orgs.length ? (done / orgs.length) * 100 : 0;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Scan for new grants</h2>
            <p className="text-[13px] text-ink-soft">
              Checks {orgs.length} funders and highlights only opportunities not seen before.
              {lastScan && !scanning && (
                <span className="text-ink-faint"> Last scanned {timeAgo(lastScan)}.</span>
              )}
            </p>
          </div>
          <Button onClick={runScan} loading={scanning} icon={<Radar className="size-4" />}>
            {scanning ? "Scanning…" : "Scan now"}
          </Button>
        </div>

        {scanning && <ProgressBar value={progress} />}

        {(scanning || done > 0) && (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {orgs.map((org) => {
              const st = states[org.id]?.status ?? "pending";
              const res = states[org.id];
              return (
                <li
                  key={org.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border px-3 py-2 text-[13px]",
                    st === "done" && res?.isNew ? "border-amber/30 bg-amber-tint/40" : "border-line bg-surface"
                  )}
                >
                  {st === "scanning" ? (
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-river" />
                  ) : st === "done" ? (
                    <Check className="size-3.5 shrink-0 text-river" />
                  ) : st === "error" ? (
                    <AlertCircle className="size-3.5 shrink-0 text-clay" />
                  ) : (
                    <span className="size-3.5 shrink-0 rounded-full border border-line-strong" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-ink">{org.name}</span>
                  {st === "done" && (
                    <span className="shrink-0 text-xs text-ink-faint">
                      {res?.found ?? 0} found
                      {res?.isNew ? <span className="font-medium text-amber"> · {res.isNew} new</span> : null}
                    </span>
                  )}
                  {st === "error" && <span className="shrink-0 text-xs text-clay">error</span>}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
