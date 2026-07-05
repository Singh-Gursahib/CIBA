import { ndjsonStream } from "@/lib/ai/stream";
import { runAgent } from "@/lib/ai/agent";
import { mockAgentRun } from "@/lib/ai/mock-agent";
import {
  KNOWLEDGE_TOOLS,
  executeKnowledgeTool,
  summarizeKnowledgeTool,
} from "@/lib/ai/tools/knowledge";
import { assistantSystemPrompt } from "@/lib/ai/prompts/assistant";
import { isMockAI } from "@/lib/config";
import type { GeminiContent } from "@/lib/ai/gemini";

export const maxDuration = 120;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const messages = (body?.messages as ChatMessage[]) ?? [];
  const question = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";

  return ndjsonStream(async (emit) => {
    if (isMockAI()) {
      await mockAgentRun(question, emit);
      return;
    }

    const contents: GeminiContent[] = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    await runAgent({
      system: assistantSystemPrompt(),
      contents,
      tools: KNOWLEDGE_TOOLS,
      exec: executeKnowledgeTool,
      summarize: summarizeKnowledgeTool,
      emit,
    });
  });
}
