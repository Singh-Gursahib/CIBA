import { currentMember } from "@/lib/os/auth";
import { brainMap } from "@/lib/os/store";
import { BrainMapGraph } from "./graph";

export default async function BrainMapPage() {
  const member = (await currentMember())!;
  const graph = brainMap(member);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brain Map</h1>
        <p className="text-sm text-muted mt-1">
          The living picture of CIBA — collaborations, partners, team, integrations, and ventures.
          Scoped to your access: you see {graph.nodes.length} nodes; an executive sees the whole brain.
        </p>
      </div>
      <BrainMapGraph nodes={graph.nodes} links={graph.links} />
    </div>
  );
}
