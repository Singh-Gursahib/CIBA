import { NextResponse } from "next/server";
import { currentMember } from "@/lib/os/auth";
import { canUseGrants } from "@/lib/os/grants/access";
import { FUNDERS } from "@/lib/os/grants/seed";
import { scanFunder } from "@/lib/os/grants/ai";
import { discoveryId, upsertDiscoveries, appendScanLog } from "@/lib/os/grants/store";
import { ndjsonStream } from "@/lib/os/stream";
import type { ScanOrgResult } from "@/lib/os/grants/types";

export const maxDuration = 300;

/** Scans every funder for open opportunities, streaming per-funder progress. */
export async function POST() {
  const member = await currentMember();
  if (!member) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canUseGrants(member)) {
    return NextResponse.json({ error: "Grants access is limited to the Funding lead and the Executive." }, { status: 403 });
  }

  const startedAt = new Date().toISOString();
  return ndjsonStream(async (emit) => {
    emit({ type: "scan_start", total: FUNDERS.length });
    const orgsChecked: ScanOrgResult[] = [];
    const newIds: string[] = [];
    for (const f of FUNDERS) {
      emit({ type: "org_start", orgId: f.id, orgName: f.name });
      try {
        const { grants } = await scanFunder(f);
        const seenAt = new Date().toISOString();
        const candidates = grants.map((g) => ({
          id: discoveryId(f.id, g.title),
          orgId: f.id,
          orgName: f.name,
          title: g.title,
          url: g.url,
          deadline: g.deadline,
          amount: g.amount,
          summary: g.summary,
          eligibility: g.eligibility,
        }));
        const fresh = await upsertDiscoveries(candidates, seenAt);
        newIds.push(...fresh.map((d) => d.id));
        const r: ScanOrgResult = { orgId: f.id, orgName: f.name, found: grants.length, isNew: fresh.length };
        orgsChecked.push(r);
        emit({ type: "org_done", ...r });
      } catch (err) {
        const r: ScanOrgResult = { orgId: f.id, orgName: f.name, found: 0, isNew: 0, error: err instanceof Error ? err.message : "failed" };
        orgsChecked.push(r);
        emit({ type: "org_done", ...r });
      }
    }
    await appendScanLog({ id: startedAt, startedAt, finishedAt: new Date().toISOString(), trigger: "manual", memberId: member.id, orgsChecked, newDiscoveryIds: newIds });
    emit({ type: "scan_done", newCount: newIds.length, checked: FUNDERS.length });
  });
}
