import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { GrantsView } from "@/features/grants/grants-view";
import {
  listOrgs,
  listDiscoveries,
  listActivityLog,
  listProposals,
  lastScanAt,
} from "@/features/grants/data";

export const metadata: Metadata = { title: "Grants" };
export const dynamic = "force-dynamic";

export default async function GrantsPage() {
  const [orgs, discoveries, log, proposals, lastScan] = await Promise.all([
    listOrgs(),
    listDiscoveries(),
    listActivityLog(),
    listProposals(),
    lastScanAt(),
  ]);

  return (
    <div className="enter space-y-8">
      <PageHeader
        title="Grants"
        description="Discover newly opened funding opportunities across BC and Canada, then turn strong matches into complete proposals."
      />
      <GrantsView
        orgs={orgs}
        discoveries={discoveries}
        log={log}
        proposals={proposals}
        lastScan={lastScan}
      />
    </div>
  );
}
