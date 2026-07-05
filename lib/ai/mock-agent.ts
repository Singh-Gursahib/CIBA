import "server-only";
import type { AgentEvent } from "./agent";
import { searchDocs } from "@/lib/content/search";
import { getDoc } from "@/lib/content/loader";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Mock assistant run: performs a real keyword search and read against the
 * local corpus, emits realistic tool events, and streams a grounded-looking
 * answer. Zero API cost, so the full chat UX is testable without a key.
 */
export async function mockAgentRun(
  question: string,
  emit: (e: AgentEvent | { type: string; [k: string]: unknown }) => void
): Promise<void> {
  emit({ type: "tool_start", id: "m1", name: "search_documents", args: { query: question } });
  await sleep(700);
  const hits = await searchDocs(question, 3);
  emit({
    type: "tool_end",
    id: "m1",
    name: "search_documents",
    summary: `Found ${hits.length} matches`,
  });

  const readTitles: string[] = [];
  for (const [i, hit] of hits.slice(0, 2).entries()) {
    emit({ type: "tool_start", id: `m2_${i}`, name: "read_document", args: { slug: hit.slug } });
    await sleep(600);
    const doc = await getDoc(hit.slug);
    readTitles.push(doc?.title ?? hit.title);
    emit({
      type: "tool_end",
      id: `m2_${i}`,
      name: "read_document",
      summary: `Read: ${doc?.title ?? hit.title}`,
    });
  }

  const answer = hits.length
    ? `Based on the knowledge base, here is what I found relevant to your question.\n\n${
        hits[0] ? `${hits[0].snippet}` : ""
      }\n\nThis is a mock response (set MOCK_AI=false with a Gemini key for a full answer). Sources: ${readTitles
        .map((t) => `**${t}**`)
        .join(", ")}.`
    : "I could not find anything relevant in the knowledge base for that question. This is a mock response; add a Gemini key and set MOCK_AI=false for full answers.";

  const words = answer.split(/(\s+)/);
  let buf = "";
  let n = 0;
  for (const w of words) {
    buf += w;
    if (++n % 3 === 0) {
      emit({ type: "text", delta: buf });
      buf = "";
      await sleep(18);
    }
  }
  if (buf) emit({ type: "text", delta: buf });
}
