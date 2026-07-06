import { ndjsonStream } from "@/lib/ai/stream";
import { isMockText } from "@/lib/config";
import { nowIso } from "@/lib/utils/dates";
import { scanOrg } from "@/lib/ai/grant-scout";
import { mockScanOrg } from "@/lib/ai/mock-scout";
import {
  listOrgs,
  upsertDiscoveries,
  appendScanLog,
} from "@/features/grants/data";
import type { Discovery, ScanLogEntry } from "@/types/grants";

export const maxDuration = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST() {
  return ndjsonStream(async (emit) => {
    const orgs = await listOrgs();
    const startedAt = nowIso();
    const mock = isMockText();

    const orgsChecked: ScanLogEntry["orgsChecked"] = [];
    const newIds: string[] = [];
    const allQueries: string[] = [];

    emit({ type: "scan_start", total: orgs.length });

    for (const org of orgs) {
      emit({ type: "org_start", orgId: org.id, orgName: org.name });

      try {
        let candidates;
        let queries: string[] = [];
        if (mock) {
          await sleep(650); // let the live UI narrate the scan
          candidates = mockScanOrg(org).map((g) => ({ ...g, orgId: org.id }));
          queries = [`${org.name} open grants`];
        } else {
          const result = await scanOrg(org);
          candidates = result.grants.map((g) => ({ ...g, orgId: org.id }));
          queries = result.queries;
        }
        allQueries.push(...queries);

        const fresh: Discovery[] = await upsertDiscoveries(candidates, startedAt);
        newIds.push(...fresh.map((d) => d.id));
        orgsChecked.push({ orgId: org.id, orgName: org.name, found: candidates.length, isNew: fresh.length });

        emit({
          type: "org_done",
          orgId: org.id,
          orgName: org.name,
          found: candidates.length,
          isNew: fresh.length,
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : "Scan failed";
        orgsChecked.push({ orgId: org.id, orgName: org.name, found: 0, isNew: 0, error });
        emit({ type: "org_done", orgId: org.id, orgName: org.name, found: 0, isNew: 0, error });
      }
    }

    const entry: ScanLogEntry = {
      id: `scan-${Date.now().toString(36)}`,
      startedAt,
      finishedAt: nowIso(),
      trigger: "manual",
      orgsChecked,
      newDiscoveryIds: newIds,
      searchQueries: allQueries,
    };
    await appendScanLog(entry);

    emit({ type: "scan_done", newCount: newIds.length, checked: orgs.length });
  });
}
