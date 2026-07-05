import "server-only";
import { isMockAI } from "@/lib/config";
import { generateText } from "@/lib/ai/gemini";
import { stripEmDashes } from "@/lib/ai/sanitize";
import type { Channel } from "@/lib/social/channels";
import type { MediaFormat } from "@/types/social";

/**
 * Render inputs the engine needs beyond the copy: the spoken narration and the
 * b-roll search terms. The creator can write the script themselves (the common
 * case, and how the channels are run); otherwise we fall back to a template, or
 * Gemini when a key is present. TTS reads plain sentences, so we keep it clean
 * (no markdown, no symbols) and strip em dashes.
 */
export interface Narration {
  text: string;
  queries: string[];
  voice: string;
}

function templateNarration(channel: Channel, brief: string, format: MediaFormat): string {
  const topic = brief.trim().replace(/\s+/g, " ");
  const cta = channel.ctaText;
  if (format === "short") {
    return [
      `${topic}.`,
      `Here is what most people miss.`,
      `The story behind it is better than the highlight, and the numbers back it up.`,
      `Stick around, because the twist at the end changes how you see it.`,
      `${cta}.`,
    ].join(" ");
  }
  return [
    `In this video we break down ${topic.toLowerCase()}, with the full story and the numbers behind it.`,
    `We start simple, set the scene, and then get into the moments that actually decided it.`,
    `Along the way you will see why it played out the way it did, and what it means looking ahead.`,
    `By the end you will have the complete picture, not just the highlight.`,
    `${cta}.`,
  ].join(" ");
}

async function geminiNarration(channel: Channel, brief: string, format: MediaFormat): Promise<string | null> {
  try {
    const words = format === "short" ? "55 to 65 seconds, about 150 words" : "9 to 10 minutes, about 1400 words";
    const text = await generateText({
      system: [
        `You are a scriptwriter for ${channel.brand}.`,
        `Write a ${words} spoken voiceover script. Spoken narration only.`,
        `No headings, no stage directions, no markdown, no emojis, no hashtags.`,
        `Strong hook in the first sentence. Plain sentences a text-to-speech engine reads cleanly (spell out symbols).`,
        `Never use em dashes. Never mention that this is AI-generated.`,
        `End on this call to action, woven in naturally: "${channel.ctaText}".`,
      ].join("\n"),
      contents: [{ role: "user", parts: [{ text: `Topic: ${brief}\nWrite the script.` }] }],
      temperature: 0.7,
    });
    return text.length > 80 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Build the narration for a post. Priority: creator-written script > Gemini
 * (real mode, key present) > template. Queries come from the channel registry.
 */
export async function buildNarration(
  channel: Channel,
  brief: string,
  format: MediaFormat,
  userScript?: string
): Promise<Narration> {
  let text = userScript?.trim();
  if (!text && !isMockAI()) text = (await geminiNarration(channel, brief, format)) ?? undefined;
  if (!text) text = templateNarration(channel, brief, format);
  return {
    text: stripEmDashes(text),
    queries: channel.brollQueries,
    voice: channel.voice,
  };
}
