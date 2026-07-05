"use client";

import { GraphCanvas } from "./graph-canvas";
import type { GraphData } from "@/types/knowledge";

/** Non-interactive dashboard miniature of the knowledge graph. */
export function GraphMini({ data }: { data: GraphData }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <GraphCanvas data={data} interactive={false} />
    </div>
  );
}
