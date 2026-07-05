import "server-only";
import { generate, type GeminiContent, type FunctionDeclaration } from "./gemini";

export type ToolResult = Record<string, unknown>;

export type AgentEvent =
  | { type: "tool_start"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_end"; id: string; name: string; summary: string }
  | { type: "text"; delta: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function streamText(text: string, emit: (e: AgentEvent) => void) {
  const words = text.split(/(\s+)/);
  let buf = "";
  let n = 0;
  for (const w of words) {
    buf += w;
    if (++n % 3 === 0) {
      emit({ type: "text", delta: buf });
      buf = "";
      await sleep(14);
    }
  }
  if (buf) emit({ type: "text", delta: buf });
}

/**
 * Function-calling loop. Emits tool_start/tool_end as the model works and
 * streams the final answer as text deltas. Returns the final answer text.
 * Ported from the FirstResponders resilience-os agent.
 */
export async function runAgent(opts: {
  system: string;
  contents: GeminiContent[];
  tools: FunctionDeclaration[];
  exec: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
  summarize: (name: string, result: ToolResult) => string;
  emit: (e: AgentEvent) => void;
  maxSteps?: number;
}): Promise<string> {
  const { system, contents, tools, exec, summarize, emit, maxSteps = 8 } = opts;

  for (let step = 0; step < maxSteps; step++) {
    const { content } = await generate({ system, contents, tools });
    if (!content) break;
    const parts = content.parts ?? [];
    const calls = parts.filter((p) => p.functionCall);

    if (calls.length === 0) {
      const text = parts.map((p) => p.text).filter(Boolean).join("").trim();
      if (text) {
        await streamText(text, emit);
        return text;
      }
      contents.push(content);
      contents.push({
        role: "user",
        parts: [{ text: "Please answer now in plain words, based on what you found." }],
      });
      continue;
    }

    // Echo the model content verbatim (preserves Gemini thoughtSignature).
    contents.push(content);

    const responseParts = [];
    let i = 0;
    for (const c of calls) {
      const fc = c.functionCall!;
      const id = fc.id || `s${step}_${i++}`;
      emit({ type: "tool_start", id, name: fc.name, args: fc.args ?? {} });
      let result: ToolResult;
      try {
        result = await exec(fc.name, fc.args ?? {});
      } catch (e) {
        result = { error: e instanceof Error ? e.message : String(e) };
      }
      emit({ type: "tool_end", id, name: fc.name, summary: summarize(fc.name, result) });
      responseParts.push({ functionResponse: { name: fc.name, id: fc.id, response: result } });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  const { content: final } = await generate({ system, contents });
  const text =
    (final?.parts.map((p) => p.text).filter(Boolean).join("").trim() || "") ||
    "I searched the knowledge base but could not put together a clear answer this time. Try rephrasing your question.";
  await streamText(text, emit);
  return text;
}
