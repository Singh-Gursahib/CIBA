import type { Channel } from "@/lib/social/channels";
import type { MediaFormat } from "@/types/social";

/**
 * System + user prompt for generating publish-ready copy (title, description,
 * caption) for a social post. Hashtags are appended from the channel registry,
 * not asked for here, so they stay curated and trademark-safe.
 *
 * House rules baked in: sentence-case, active voice, no em dashes, and never
 * mention that the content is AI-generated (it hurts reach on the viral
 * channels and the brand voice is the creator's, not a tool's).
 */
export function socialCopySystem(): string {
  return [
    "You write short, punchy copy for a social media channel's YouTube and Instagram posts.",
    "Voice: confident, energetic, native to the platform. Sentence case, active voice.",
    "Hard rules:",
    "- Never use em dashes or en dashes. Use commas or short sentences.",
    "- Never say the content is AI-generated, automated, or a tool. Speak as the creator.",
    "- No clickbait lies. Hook fast, deliver the promise.",
    "- Do not include hashtags in the title, description, or caption; they are added separately.",
  ].join("\n");
}

export function socialCopyUser(channel: Channel, brief: string, format: MediaFormat): string {
  const kind = format === "short" ? "a vertical short / reel (~30-60s)" : "a long-form video (~8-10min)";
  return [
    `Channel: ${channel.brand} — ${channel.blurb}`,
    `Format: ${kind}.`,
    `Topic / brief from the creator: "${brief}"`,
    "",
    "Produce JSON with:",
    '- "title": a YouTube-ready title, <= 90 chars, hooky, no hashtags.',
    '- "description": a YouTube description, 2-4 short lines, ends with the CTA: ' +
      `"${channel.ctaText}${channel.ctaSub ? " (" + channel.ctaSub + ")" : ""}". No hashtags.`,
    '- "caption": an Instagram caption, 1-2 punchy lines + a question to drive comments. No hashtags.',
  ].join("\n");
}

export const SOCIAL_COPY_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    caption: { type: "string" },
  },
  required: ["title", "description", "caption"],
} as const;
