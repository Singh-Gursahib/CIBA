import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { BRAND_DIR } from "@/lib/config";
import type { MarketingJob, OutputFormat } from "@/types/marketing";

const FORMAT_GUIDANCE: Record<OutputFormat, string> = {
  instagram_post:
    "Square 1:1 Instagram post. Centered composition with the event title as the dominant element, balanced margins on all sides.",
  instagram_story:
    "Vertical Instagram story. Tall hero composition: title in the upper third, imagery through the middle, event details and call to action in a clean band across the lower third.",
  linkedin_post:
    "Horizontal LinkedIn post. Professional editorial layout: title-led left-aligned or centered hierarchy, calm and credible, suitable for a business audience feed.",
  mobile_post:
    "Vertical mobile-first post. Large legible type sized for small screens, strong contrast, single clear focal point.",
};

/**
 * Palette inspired by Thompson Rivers University's brand, CIBA's strategic
 * academic partner. Fed into the image prompt for a cohesive, on-brand look.
 */
const PALETTE = [
  "Deep blue #003E51 (primary, backgrounds and large blocks)",
  "Bright teal #00B0B9 (accent, highlights and rules)",
  "Warm yellow #FFCD00 (sparing punch for a key word or the call to action)",
  "Sage #BAD1BA and cloud #FFF5DE (soft, calm supporting tones and light bands)",
  "Off-white #FAF9F7 background and deep ink #16181D for body text",
].join("; ");

async function loadBrandDoc(): Promise<string> {
  try {
    return await fs.readFile(path.join(BRAND_DIR, "brand.md"), "utf8");
  } catch {
    return "CIBA (Central Interior Business Accelerator) is a regional innovation hub serving the Central Interior of British Columbia, with Thompson Rivers University as its strategic academic partner. Three pillars: Innovation, Collaboration, Investment. Style: warm professionalism, community-rooted, clear. Colors: deep teal #14655F, warm off-white #FAF9F7, ink #16181D, amber accent #C97B22.";
  }
}

export async function composePosterPrompt(
  job: MarketingJob,
  format: OutputFormat,
  hasLogos: boolean
): Promise<string> {
  const brand = await loadBrandDoc();

  const logoRule = hasLogos
    ? "- Both provided logo images (CIBA and TRU) must appear together in a clean strip near the bottom, undistorted, on a light band, with clear space around each."
    : "- Render a tidy co-brand lockup near the bottom on a light band: the wordmark \"CIBA\" on the left and \"Thompson Rivers University\" on the right, in clean, correctly spelled type with clear space around each.";

  const details = [
    job.eventName && `Event name (use verbatim as the headline): ${job.eventName}`,
    job.eventDetails && `Date / time / venue (use verbatim): ${job.eventDetails}`,
    job.cta && `Call to action (use verbatim): ${job.cta}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "You are a senior graphic designer. Compose a single, polished, formal marketing poster for CIBA (Central Interior Business Accelerator), a regional innovation hub whose strategic academic partner is Thompson Rivers University (TRU).",
    "",
    "== COMPOSITION ==",
    "Arrange the supplied reference photographs into a refined, professional collage: a clean grid or a layered arrangement with a clear focal image, subtle rounded corners or thin dividers, and generous whitespace. The result should look like corporate marketing material designed by a professional studio, not a casual social post. Balance imagery with a strong headline and a tidy information block.",
    "",
    "== COLOR PALETTE (follow closely, inspired by Thompson Rivers University) ==",
    PALETTE,
    "Lean on deep blue and teal for a formal, credible feel, with yellow used sparingly as a single accent.",
    "",
    "== BRAND GUIDELINES ==",
    brand,
    "",
    "== FORMAT ==",
    FORMAT_GUIDANCE[format],
    "",
    "== THIS EVENT ==",
    job.brief,
    details ? `\n${details}` : "",
    "",
    "== HARD RULES ==",
    "- Build the collage from the supplied reference photographs; keep faces and important subjects intact and undistorted.",
    logoRule,
    "- All text must be perfectly spelled and legible, using only the event details given above. Never invent dates, prices, or URLs.",
    "- Strong typographic hierarchy: event title largest, then date and venue, then the call to action. Use a refined sans-serif or elegant serif for headings.",
    "- Keep all essential text inside a 6% safe margin from every edge. Overall tone: formal, modern, and confident.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
