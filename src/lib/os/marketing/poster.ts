// CIBA-branded SVG poster generator. Deterministic and on-brand (no external
// image API needed), so the Marketing Studio works with zero keys and zero cost.

export type PosterFormat = "instagram_post" | "instagram_story" | "linkedin_post" | "poster";

export const FORMAT_META: Record<PosterFormat, { label: string; w: number; h: number; platform: string }> = {
  instagram_post: { label: "Instagram post", w: 1080, h: 1080, platform: "Instagram" },
  instagram_story: { label: "Instagram story", w: 1080, h: 1920, platform: "Instagram" },
  linkedin_post: { label: "LinkedIn banner", w: 1200, h: 628, platform: "LinkedIn" },
  poster: { label: "Event poster", w: 1080, h: 1350, platform: "Print / feed" },
};

export const ALL_FORMATS = Object.keys(FORMAT_META) as PosterFormat[];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Word-wrap text into <= maxChars lines (max `maxLines`). */
function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, "…");
  }
  return lines;
}

export interface PosterInput {
  format: PosterFormat;
  eyebrow?: string; // e.g. "CIBA presents"
  title: string;
  details?: string; // date / location
  cta?: string;
}

export function buildPosterSvg(input: PosterInput): string {
  const { w, h } = FORMAT_META[input.format];
  const wide = w > h;
  const pad = Math.round(w * 0.075);
  const cx = w / 2;

  const eyebrow = esc((input.eyebrow || "CIBA presents").toUpperCase());
  const titleSize = Math.round((wide ? w * 0.06 : w * 0.085));
  const titleLines = wrap(input.title, wide ? 22 : 16, 3);
  const titleBlockTop = h * (wide ? 0.34 : 0.3);
  const lineGap = titleSize * 1.12;

  const details = input.details ? esc(input.details) : "";
  const cta = input.cta ? esc(input.cta.toUpperCase()) : "";

  const titleTspans = titleLines
    .map((ln, i) => `<text x="${pad}" y="${titleBlockTop + i * lineGap}" font-family="Georgia, 'Times New Roman', serif" font-size="${titleSize}" font-weight="700" fill="#0a3f33">${esc(ln)}</text>`)
    .join("");

  const detailY = titleBlockTop + titleLines.length * lineGap + h * 0.03;
  const ctaY = wide ? h - pad - h * 0.06 : h * 0.8;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7f8f6"/>
      <stop offset="100%" stop-color="#e6f2ee"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0f5c4a"/>
      <stop offset="100%" stop-color="#0a3f33"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${w * 0.92}" cy="${h * 0.1}" r="${w * 0.16}" fill="#e07a2f" opacity="0.14"/>
  <path d="M0 ${h * 0.82} C ${w * 0.3} ${h * 0.76}, ${w * 0.55} ${h * 0.9}, ${w} ${h * 0.8} L ${w} ${h} L 0 ${h} Z" fill="#0f5c4a" opacity="0.10"/>
  <rect x="${pad}" y="${h * (wide ? 0.16 : 0.14)}" width="${w * 0.09}" height="6" fill="#e07a2f"/>
  <text x="${pad}" y="${h * (wide ? 0.23 : 0.19)}" font-family="Arial, sans-serif" font-size="${Math.round(w * 0.022)}" font-weight="700" letter-spacing="4" fill="#e07a2f">${eyebrow}</text>
  ${titleTspans}
  ${details ? `<text x="${pad}" y="${detailY}" font-family="Arial, sans-serif" font-size="${Math.round(w * 0.026)}" font-weight="600" fill="#5c6b63">${details}</text>` : ""}
  ${cta ? `<g><rect x="${pad}" y="${ctaY}" width="${Math.min(w - pad * 2, cta.length * (w * 0.017) + w * 0.06)}" height="${h * 0.05}" rx="${h * 0.025}" fill="url(#accent)"/><text x="${pad + w * 0.03}" y="${ctaY + h * 0.033}" font-family="Arial, sans-serif" font-size="${Math.round(w * 0.02)}" font-weight="700" fill="#ffffff">${cta}</text></g>` : ""}
  <g>
    <text x="${pad}" y="${h - pad * 0.6}" font-family="Arial, sans-serif" font-size="${Math.round(w * 0.026)}" font-weight="800" fill="#0f5c4a">CIBA</text>
    <text x="${w - pad}" y="${h - pad * 0.6}" text-anchor="end" font-family="Arial, sans-serif" font-size="${Math.round(w * 0.016)}" fill="#9aa0ae">Central Interior Business Accelerator</text>
  </g>
</svg>`;
}
