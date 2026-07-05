// Publish-ready copy (title/description/caption/hashtags) for a post.
// Demo-mode-first: a deterministic template unless an Anthropic key is set,
// then Claude via the OS AI layer. Em dashes stripped; never mentions AI.

import { generateObject } from "ai";
import { z } from "zod";
import { model } from "@/lib/ai";
import { isMockCopy } from "./config";
import { stripEmDashes } from "./sanitize";
import type { Channel } from "./channels";
import type { MediaFormat } from "./types";

export interface GeneratedCopy {
  title: string;
  description: string;
  caption: string;
  hashtags: string[];
}

function formatTag(format: MediaFormat): string[] {
  return format === "short" ? ["#shorts", "#reels"] : [];
}

function titleCase(brief: string): string {
  const t = brief.trim().replace(/\s+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function templateCopy(channel: Channel, brief: string, format: MediaFormat): GeneratedCopy {
  const topic = titleCase(brief).slice(0, 80);
  const ctaLine = `${channel.ctaText}${channel.ctaSub ? ` — ${channel.ctaSub}` : ""}`;
  return {
    title: `${topic} | ${channel.brand}`.slice(0, 90),
    description: [topic + ".", "The story, the numbers, and the moment that mattered.", ctaLine].join("\n"),
    caption: `${topic}. Which side are you on?`,
    hashtags: [...channel.hashtags, ...formatTag(format)],
  };
}

const SCHEMA = z.object({
  title: z.string().describe("YouTube-ready title, <=90 chars, hooky, no hashtags"),
  description: z.string().describe("YouTube description, 2-4 short lines, ends with the CTA, no hashtags"),
  caption: z.string().describe("Instagram caption, 1-2 punchy lines + a question, no hashtags"),
});

async function claudeCopy(channel: Channel, brief: string, format: MediaFormat): Promise<GeneratedCopy> {
  const kind = format === "short" ? "a vertical short / reel (~30-60s)" : "a long-form video (~8-10min)";
  const { object } = await generateObject({
    model,
    schema: SCHEMA,
    system:
      "You write short, platform-native copy for a social channel's YouTube and Instagram posts. " +
      "Sentence case, active voice. Never use em dashes. Never say the content is AI-generated. " +
      "Do not include hashtags in any field.",
    prompt:
      `Channel: ${channel.brand} — ${channel.blurb}\nFormat: ${kind}.\n` +
      `Topic from the creator: "${brief}"\n` +
      `The description must end with this CTA: "${channel.ctaText}${channel.ctaSub ? " (" + channel.ctaSub + ")" : ""}".`,
  });
  return { ...object, hashtags: [...channel.hashtags, ...formatTag(format)] };
}

export async function generateCopy(channel: Channel, brief: string, format: MediaFormat): Promise<GeneratedCopy> {
  let copy: GeneratedCopy;
  if (isMockCopy()) {
    copy = templateCopy(channel, brief, format);
  } else {
    try {
      copy = await claudeCopy(channel, brief, format);
    } catch {
      copy = templateCopy(channel, brief, format);
    }
  }
  return {
    title: stripEmDashes(copy.title).slice(0, 100),
    description: stripEmDashes(copy.description),
    caption: stripEmDashes(copy.caption),
    hashtags: copy.hashtags,
  };
}
