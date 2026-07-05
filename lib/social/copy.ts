import "server-only";
import { isMockAI } from "@/lib/config";
import { generateJson } from "@/lib/ai/gemini";
import { stripEmDashes } from "@/lib/ai/sanitize";
import { socialCopySystem, socialCopyUser, SOCIAL_COPY_SCHEMA } from "@/lib/ai/prompts/social";
import type { Channel } from "@/lib/social/channels";
import type { MediaFormat } from "@/types/social";

export interface GeneratedCopy {
  title: string;
  description: string;
  caption: string;
  hashtags: string[];
}

/** Format tag appended to the hashtag set at publish time. */
function formatTag(format: MediaFormat): string[] {
  return format === "short" ? ["#shorts", "#reels"] : [];
}

function titleCaseBrief(brief: string): string {
  const t = brief.trim().replace(/\s+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Deterministic, zero-cost copy for mock mode (MOCK_AI default). */
function mockCopy(channel: Channel, brief: string, format: MediaFormat): GeneratedCopy {
  const topic = titleCaseBrief(brief).slice(0, 80);
  const ctaLine = `${channel.ctaText}${channel.ctaSub ? ` — ${channel.ctaSub}` : ""}`;
  return {
    title: `${topic} | ${channel.brand}`.slice(0, 90),
    description: [
      topic + ".",
      "The story, the numbers, and the moment that mattered.",
      ctaLine,
    ].join("\n"),
    caption: `${topic}. Which side are you on?`,
    hashtags: [...channel.hashtags, ...formatTag(format)],
  };
}

/**
 * Generate publish-ready copy for a post. Mock mode returns a deterministic
 * template (no keys, no cost); real mode calls Gemini. Every field is run
 * through the em-dash sanitizer, per house rules.
 */
export async function generateCopy(
  channel: Channel,
  brief: string,
  format: MediaFormat
): Promise<GeneratedCopy> {
  let copy: GeneratedCopy;

  if (isMockAI()) {
    copy = mockCopy(channel, brief, format);
  } else {
    const result = await generateJson<{ title: string; description: string; caption: string }>({
      system: socialCopySystem(),
      contents: [{ role: "user", parts: [{ text: socialCopyUser(channel, brief, format) }] }],
      responseSchema: SOCIAL_COPY_SCHEMA as unknown as Record<string, unknown>,
      temperature: 0.7,
    });
    copy = {
      title: (result.title || titleCaseBrief(brief)).slice(0, 100),
      description: result.description || "",
      caption: result.caption || "",
      hashtags: [...channel.hashtags, ...formatTag(format)],
    };
  }

  return {
    title: stripEmDashes(copy.title),
    description: stripEmDashes(copy.description),
    caption: stripEmDashes(copy.caption),
    hashtags: copy.hashtags,
  };
}
