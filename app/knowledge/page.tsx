import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Waypoints } from "lucide-react";
import { GraphView } from "@/features/knowledge/graph-view";
import { buildGraph } from "@/lib/content/graph";
import { listDocMeta } from "@/lib/content/data";

export const metadata: Metadata = { title: "Knowledge" };
export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const [data, docs] = await Promise.all([buildGraph(), listDocMeta()]);

  return (
    <div className="enter space-y-6">
      <PageHeader
        title="Knowledge"
        description="CIBA's projects, grants, partnerships, and notes as one interconnected graph. Click a node to preview, double-click to open."
      />
      {data.nodes.length === 0 ? (
        <EmptyState
          icon={<Waypoints />}
          title="No documents yet"
          description="Add Markdown files to content/knowledge to populate the graph."
          className="py-24"
        />
      ) : (
        <GraphView data={data} docs={docs} />
      )}
    </div>
  );
}
