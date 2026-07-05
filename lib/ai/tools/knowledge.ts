import "server-only";
import type { FunctionDeclaration } from "@/lib/ai/gemini";
import type { ToolResult } from "@/lib/ai/agent";
import { loadDocs, getDoc } from "@/lib/content/loader";
import { searchDocs } from "@/lib/content/search";

/**
 * Tool-calling document selection (deliberately not RAG). The model lists,
 * searches, and reads only the documents it needs before answering.
 */
export const KNOWLEDGE_TOOLS: FunctionDeclaration[] = [
  {
    name: "list_documents",
    description:
      "List all documents in CIBA's knowledge base with their type, tags, and one-line summary. Use this to get an overview before searching.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            "Optional filter by document type: org, program, project, grant, meeting, partnership, event, or internal.",
        },
      },
    },
  },
  {
    name: "search_documents",
    description:
      "Search the knowledge base by keywords. Returns the most relevant documents with a short snippet. Use specific terms from the user's question.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords to search for." },
      },
      required: ["query"],
    },
  },
  {
    name: "read_document",
    description:
      "Read the full content of one document by its slug (from list or search results). Read a document before citing it.",
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The document slug." },
      },
      required: ["slug"],
    },
  },
];

export async function executeKnowledgeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case "list_documents": {
      const docs = await loadDocs();
      const type = args.type ? String(args.type) : null;
      const filtered = type ? docs.filter((d) => d.type === type) : docs;
      return {
        count: filtered.length,
        documents: filtered.map((d) => ({
          slug: d.slug,
          title: d.title,
          type: d.type,
          tags: d.tags,
          summary: d.summary,
          date: d.date,
        })),
      };
    }
    case "search_documents": {
      const results = await searchDocs(String(args.query ?? ""));
      return { count: results.length, results };
    }
    case "read_document": {
      const doc = await getDoc(String(args.slug ?? ""));
      if (!doc) return { error: `No document with slug "${args.slug}"` };
      return {
        slug: doc.slug,
        title: doc.title,
        type: doc.type,
        date: doc.date,
        content: doc.content,
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export function summarizeKnowledgeTool(name: string, result: ToolResult): string {
  if (result.error) return String(result.error);
  if (name === "list_documents") return `Listed ${result.count} documents`;
  if (name === "search_documents") return `Found ${result.count} matches`;
  if (name === "read_document") return `Read: ${result.title ?? result.slug}`;
  return "Done";
}
