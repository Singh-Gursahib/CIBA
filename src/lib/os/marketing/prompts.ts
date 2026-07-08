// Builds the text prompt fed to gpt-image for real poster generation.
// Ported from gursahib/feat/live-ai-integrations:lib/ai/prompts/marketing.ts and
// adapted to CIBA Launchpad's PosterInput shape. Only used when an OpenAI key is
// configured; the SVG generator remains the zero-key default.

import { type PosterInput, type PosterFormat } from "./poster";

const FORMAT_GUIDANCE: Record<PosterFormat, string> = {
  instagram_post:
    "Square 1:1 Instagram post. Centered composition with the event title as the dominant element, balanced margins on all sides.",
  instagram_story:
    "Vertical Instagram story. Tall hero composition: title in the upper third, imagery through the middle, event details and call to action in a clean band across the lower third.",
  linkedin_post:
    "Horizontal LinkedIn banner. Professional editorial layout: title-led left-aligned or centered hierarchy, calm and credible, suitable for a business audience feed.",
  poster:
    "Portrait event poster for print or feed. Strong single focal composition with a large headline, tidy information block, and generous margins.",
};

/**
 * Palette inspired by Thompson Rivers University's brand, CIBA's strategic
 * academic partner, plus CIBA's own teal/amber. Fed into the image prompt for a
 * cohesive, on-brand look that matches the SVG fallback.
 */
const PALETTE = [
  "Deep teal #0a3f33 and #0f5c4a (primary, backgrounds and large blocks)",
  "Amber #e07a2f (accent, sparing punch for a key word or the call to action)",
  "Off-white #f7f8f6 and soft mint #e6f2ee (calm supporting tones and light bands)",
  "Deep ink #16181d for body text and muted slate #5c6b63 for secondary details",
].join("; ");

const BRAND_DOC =
  "CIBA (Central Interior Business Accelerator) is a regional innovation hub serving the Central Interior of British Columbia, with Thompson Rivers University (TRU) as its strategic academic partner. Three pillars: Innovation, Collaboration, Investment. Style: warm professionalism, community-rooted, clear and confident.";

/**
 * Compose a single-poster image prompt from event details + format + CIBA brand
 * guidance. `hasLogos` toggles between "use the supplied logo images" and
 * "render a clean co-brand wordmark lockup".
 */
export function composePosterPrompt(input: PosterInput, hasLogos: boolean): string {
  const { format } = input;

  const logoRule = hasLogos
    ? '- Both provided logo images (CIBA and TRU) must appear together in a clean strip near the bottom, undistorted, on a light band, with clear space around each.'
    : '- Render a tidy co-brand lockup near the bottom on a light band: the wordmark "CIBA" on the left and "Thompson Rivers University" on the right, in clean, correctly spelled type with clear space around each.';

  const details = [
    input.eyebrow && `Eyebrow / kicker (use verbatim, above the title): ${input.eyebrow}`,
    input.title && `Event title (use verbatim as the headline): ${input.title}`,
    input.details && `Date / time / venue (use verbatim): ${input.details}`,
    input.cta && `Call to action (use verbatim): ${input.cta}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "You are a senior graphic designer. Compose a single, polished, formal marketing poster for CIBA (Central Interior Business Accelerator), a regional innovation hub whose strategic academic partner is Thompson Rivers University (TRU).",
    "",
    "== COMPOSITION ==",
    "Design refined, professional corporate marketing material: a clear focal composition, subtle geometric accents, and generous whitespace. It should look like it was designed by a professional studio, not a casual social post. Balance a strong headline with a tidy information block.",
    "",
    "== COLOR PALETTE (follow closely) ==",
    PALETTE,
    "Lean on deep teal for a formal, credible feel, with amber used sparingly as a single accent.",
    "",
    "== BRAND GUIDELINES ==",
    BRAND_DOC,
    "",
    "== FORMAT ==",
    FORMAT_GUIDANCE[format],
    "",
    "== THIS EVENT ==",
    details,
    "",
    "== HARD RULES ==",
    logoRule,
    "- All text must be perfectly spelled and legible, using only the event details given above. Never invent dates, prices, or URLs.",
    "- Strong typographic hierarchy: event title largest, then date and venue, then the call to action. Use a refined sans-serif or elegant serif for headings.",
    "- Keep all essential text inside a 6% safe margin from every edge. Overall tone: formal, modern, and confident.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
