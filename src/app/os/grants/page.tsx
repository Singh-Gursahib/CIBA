import { Landmark } from "lucide-react";
import { currentMember } from "@/lib/os/auth";
import { canUseGrants } from "@/lib/os/grants/access";
import { FUNDERS } from "@/lib/os/grants/seed";
import { listDiscoveries, listProposals } from "@/lib/os/grants/store";
import { PageHeader } from "@/components/ui";
import { GrantsView } from "./grants-view";

export default async function GrantsPage() {
  const member = (await currentMember())!;

  if (!canUseGrants(member)) {
    return (
      <div className="space-y-5">
        <PageHeader title="Grants" subtitle="Find funding and build proposals." icon={<Landmark />} />
        <div className="card p-8 text-center">
          <p className="text-3xl">🔒</p>
          <p className="mt-3 font-semibold">Grants is scoped to Funding & Executive</p>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">
            The grant locator and proposal builder are limited to the Partnerships & Funding Lead (Sofia) and the
            Executive Director. Ask them to shortlist an opportunity for your collaboration.
          </p>
        </div>
      </div>
    );
  }

  const [discoveries, proposals] = await Promise.all([listDiscoveries(), listProposals()]);
  return <GrantsView discoveries={discoveries} proposals={proposals} funders={FUNDERS} />;
}
