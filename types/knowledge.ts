export type DocType =
  | "org"
  | "program"
  | "project"
  | "grant"
  | "meeting"
  | "partnership"
  | "event"
  | "internal";

export const DOC_TYPE_META: Record<DocType, { label: string; color: string }> = {
  org: { label: "Organization", color: "#14655F" },
  program: { label: "Program", color: "#2E8B7F" },
  project: { label: "Project", color: "#C97B22" },
  grant: { label: "Grant", color: "#B4552D" },
  meeting: { label: "Meeting", color: "#6C8A4E" },
  partnership: { label: "Partnership", color: "#8A6FB0" },
  event: { label: "Event", color: "#D4A017" },
  internal: { label: "Internal", color: "#5A6070" },
};

export interface KnowledgeDoc {
  slug: string;
  title: string;
  type: DocType;
  tags: string[];
  date: string;
  status: string;
  summary: string;
  content: string;
}

export type DocMeta = Omit<KnowledgeDoc, "content">;

export interface GraphNode {
  id: string; // slug
  label: string;
  kind: DocType;
  degree: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
