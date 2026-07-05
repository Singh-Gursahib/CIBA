import { anthropic } from "@ai-sdk/anthropic";

// Whether a real Anthropic key is configured. When false, the API routes fall
// back to a deterministic heuristic engine so the whole app still runs & demos
// end-to-end with zero setup ("demo mode").
export const AI_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY);

// Fast, cheap model is plenty for these structured-reasoning tasks.
export const model = anthropic("claude-haiku-4-5-20251001");

// Higher-quality model for the nuanced mentor-matching reasoning.
export const reasoningModel = anthropic("claude-sonnet-5");
