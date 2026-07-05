// Narration + b-roll queries for the render engine. Creator-written script
// wins; else Claude (when configured); else a template. TTS-clean, no em dashes.

import { generateText } from "ai";
import { model } from "@/lib/ai";
import { isMockCopy } from "./config";
import { stripEmDashes } from "./sanitize";
import type { Channel } from "./channels";
import type { MediaFormat } from "./types";

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

async function claudeNarration(channel: Channel, brief: string, format: MediaFormat): Promise<string | null> {
  try {
    const len = format === "short" ? "55 to 65 seconds, about 150 words" : "9 to 10 minutes, about 1400 words";
    const { text } = await generateText({
      model,
      system:
        `You are a scriptwriter for ${channel.brand}. Write a ${len} spoken voiceover script. ` +
        "Spoken narration only. No headings, stage directions, markdown, emojis, or hashtags. " +
        "Strong hook first. Plain sentences a text-to-speech engine reads cleanly (spell out symbols). " +
        `Never use em dashes. Never mention this is AI-generated. End on this CTA: "${channel.ctaText}".`,
      prompt: `Topic: ${brief}\nWrite the script.`,
    });
    return text.trim().length > 80 ? text.trim() : null;
  } catch {
    return null;
  }
}

export async function buildNarration(
  channel: Channel,
  brief: string,
  format: MediaFormat,
  userScript?: string,
): Promise<Narration> {
  let text = userScript?.trim();
  if (!text && !isMockCopy()) text = (await claudeNarration(channel, brief, format)) ?? undefined;
  if (!text) text = templateNarration(channel, brief, format);
  return { text: stripEmDashes(text), queries: channel.brollQueries, voice: channel.voice };
}
