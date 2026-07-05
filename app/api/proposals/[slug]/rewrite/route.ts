import { NextResponse } from "next/server";
import { isMockAI } from "@/lib/config";
import { generateText } from "@/lib/ai/gemini";
import { stripEmDashes } from "@/lib/ai/sanitize";

export const maxDuration = 120;

function mockRewrite(text: string, instruction: string): string {
  const i = instruction.toLowerCase();
  if (i.includes("shorten")) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(" ");
  }
  if (i.includes("expand")) {
    return `${text} This expanded framing adds supporting detail and reinforces the point for the reader (mock rewrite).`;
  }
  if (i.includes("formal")) {
    return text.replace(/\bwe\b/gi, "CIBA").replace(/\bcan't\b/gi, "cannot").replace(/\bwon't\b/gi, "will not");
  }
  return `${text.trim()} (rewritten in mock mode; add a Gemini key for a full rewrite).`;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    scope?: "selection" | "document";
    text?: string;
    instruction?: string;
    proposalContext?: string;
  };
  const text = body.text ?? "";
  const instruction = body.instruction || "Rewrite";
  if (!text.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });

  if (isMockAI()) {
    return NextResponse.json({ text: stripEmDashes(mockRewrite(text, instruction)) });
  }

  try {
    const system = [
      "You are an editing assistant for CIBA grant proposals.",
      body.scope === "document"
        ? "Rewrite the entire document per the instruction, preserving Markdown structure and section headings."
        : "Rewrite only the provided passage per the instruction. Return just the rewritten passage, with no preamble, quotes, or explanation. Preserve its role in the surrounding document.",
      "Keep the meaning and any specific facts, figures, and names intact.",
      "Never use em dashes. Use commas, colons, or parentheses instead.",
    ].join("\n");

    const out = await generateText({
      system,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Instruction: ${instruction}\n${
                body.proposalContext ? `\nDocument context:\n${body.proposalContext}\n` : ""
              }\nPassage to rewrite:\n${text}`,
            },
          ],
        },
      ],
      temperature: 0.6,
    });
    return NextResponse.json({ text: stripEmDashes(out.trim()) });
  } catch {
    return NextResponse.json({ error: "Rewrite failed" }, { status: 500 });
  }
}
