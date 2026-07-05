"use client";

import { useMemo, useState } from "react";
import { Landmark, History, FileText, Compass } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ScanPanel } from "./scan-panel";
import { DiscoveryCard } from "./discovery-card";
import { ActivityLog } from "./activity-log";
import { ProposalsList } from "./proposals-list";
import { ProposalFlow } from "./proposal-flow";
import type {
  Discovery,
  FundingOrg,
  ProposalMeta,
  ScanLogEntry,
} from "@/types/grants";

type Tab = "discoveries" | "log" | "proposals";

export function GrantsView({
  orgs,
  discoveries,
  log,
  proposals,
  lastScan,
}: {
  orgs: FundingOrg[];
  discoveries: Discovery[];
  log: ScanLogEntry[];
  proposals: ProposalMeta[];
  lastScan: string | null;
}) {
  const [tab, setTab] = useState<Tab>("discoveries");
  const [proposalFor, setProposalFor] = useState<Discovery | null>(null);

  const orgById = useMemo(() => new Map(orgs.map((o) => [o.id, o])), [orgs]);
  const active = discoveries.filter((d) => d.status !== "dismissed");
  const fresh = active.filter((d) => d.status === "new");
  const rest = active.filter((d) => d.status !== "new");

  return (
    <div className="space-y-6">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "discoveries", label: "Discoveries", icon: <Compass className="size-3.5" /> },
          { value: "log", label: "Activity log", icon: <History className="size-3.5" /> },
          { value: "proposals", label: "Proposals", icon: <FileText className="size-3.5" /> },
        ]}
      />

      {tab === "discoveries" && (
        <div className="space-y-6">
          <ScanPanel orgs={orgs} lastScan={lastScan} />

          {active.length === 0 ? (
            <EmptyState
              icon={<Landmark />}
              title="No opportunities yet"
              description="Run a scan to check funders for open grant programs. New opportunities will appear here."
              className="py-16"
            />
          ) : (
            <div className="space-y-6">
              {fresh.length > 0 && (
                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                    New
                    <span className="rounded-full bg-amber-tint px-2 py-0.5 text-[11px] font-medium text-amber">
                      {fresh.length}
                    </span>
                  </h2>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {fresh.map((d) => (
                      <DiscoveryCard key={d.id} discovery={d} org={orgById.get(d.orgId)} onStartProposal={setProposalFor} />
                    ))}
                  </div>
                </section>
              )}
              {rest.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-ink">
                    {fresh.length > 0 ? "Previously seen" : "Opportunities"}
                  </h2>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {rest.map((d) => (
                      <DiscoveryCard key={d.id} discovery={d} org={orgById.get(d.orgId)} onStartProposal={setProposalFor} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "log" && <ActivityLog entries={log} />}
      {tab === "proposals" && <ProposalsList proposals={proposals} />}

      {proposalFor && <ProposalFlow discovery={proposalFor} onClose={() => setProposalFor(null)} />}
    </div>
  );
}
