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

async function loadBrandDoc(): Promise<string> {
  try {
    return await fs.readFile(path.join(BRAND_DIR, "brand.md"), "utf8");
  } catch {
    return "CIBA (Central Interior Business Accelerator) is a regional innovation hub serving the Central Interior of British Columbia, with Thompson Rivers University as its strategic academic partner. Three pillars: Innovation, Collaboration, Investment. Style: warm professionalism, community-rooted, clear. Colors: deep teal #14655F, warm off-white #FAF9F7, ink #16181D, amber accent #C97B22.";
  }
}

export async function composePosterPrompt(job: MarketingJob, format: OutputFormat): Promise<string> {
  const brand = await loadBrandDoc();

  const details = [
    job.eventName && `Event name (use verbatim as the headline): ${job.eventName}`,
    job.eventDetails && `Date / time / venue (use verbatim): ${job.eventDetails}`,
    job.cta && `Call to action (use verbatim): ${job.cta}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "Design a polished event poster for CIBA (Central Interior Business Accelerator).",
    "",
    "== BRAND GUIDELINES (follow strictly) ==",
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
    "- Incorporate the supplied reference images tastefully; the logo images provided must appear in a clean strip near the bottom, undistorted, on a light band.",
    "- All text must be perfectly spelled, using only the event details given above. Never invent dates, prices, or URLs.",
    "- Strong typographic hierarchy: event title largest, then date/venue, then call to action.",
    "- Keep all essential text inside a 6% safe margin from every edge.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
