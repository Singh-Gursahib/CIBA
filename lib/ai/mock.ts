import "server-only";
import { FORMAT_META, type OutputFormat } from "@/types/marketing";

/**
 * Mock-mode asset generation: branded SVG placeholder posters, zero API cost.
 * Real runs produce PNGs via gpt-image-1; mock runs produce these SVGs so the
 * whole flow (progress, gallery, download, history) is testable without keys.
 */

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function mockPosterSvg(opts: {
  format: OutputFormat;
  eventName?: string;
  brief: string;
  eventDetails?: string;
  cta?: string;
}): string {
  const { size } = FORMAT_META[opts.format];
  const [w, h] = size.split("x").map(Number);
  const title = escapeXml(opts.eventName || "CIBA Event");
  const detail = escapeXml(opts.eventDetails || "");
  const cta = escapeXml(opts.cta || "");
  const briefLine = escapeXml(opts.brief.slice(0, 90) + (opts.brief.length > 90 ? "…" : ""));
  const cx = w / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FAF9F7"/>
      <stop offset="100%" stop-color="#E7F0EF"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <path d="M0 ${h * 0.72} C ${w * 0.25} ${h * 0.66}, ${w * 0.4} ${h * 0.8}, ${w} ${h * 0.7} L ${w} ${h} L 0 ${h} Z" fill="#14655F" opacity="0.09"/>
  <path d="M0 ${h * 0.78} C ${w * 0.3} ${h * 0.72}, ${w * 0.5} ${h * 0.86}, ${w} ${h * 0.76} L ${w} ${h} L 0 ${h} Z" fill="#14655F" opacity="0.14"/>
  <text x="${cx}" y="${h * 0.12}" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.round(w * 0.028)}" fill="#C97B22" letter-spacing="4">CIBA PRESENTS</text>
  <text x="${cx}" y="${h * 0.32}" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.round(w * 0.07)}" fill="#14655F">${title}</text>
  <text x="${cx}" y="${h * 0.42}" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="${Math.round(w * 0.024)}" fill="#5A6070">${briefLine}</text>
  ${detail ? `<text x="${cx}" y="${h * 0.52}" text-anchor="middle" font-family="Helvetica, sans-serif" font-weight="bold" font-size="${Math.round(w * 0.026)}" fill="#16181D">${detail}</text>` : ""}
  ${cta ? `<g><rect x="${cx - w * 0.14}" y="${h * 0.58}" width="${w * 0.28}" height="${h * 0.05}" rx="${h * 0.025}" fill="#14655F"/><text x="${cx}" y="${h * 0.58 + h * 0.033}" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="${Math.round(w * 0.02)}" fill="#FFFFFF">${cta}</text></g>` : ""}
  <rect x="0" y="${h - Math.round(h * 0.085)}" width="${w}" height="${Math.round(h * 0.085)}" fill="#FFFFFF" opacity="0.9"/>
  <text x="${w * 0.05}" y="${h - Math.round(h * 0.032)}" font-family="Helvetica, sans-serif" font-weight="bold" font-size="${Math.round(w * 0.022)}" fill="#14655F">CIBA</text>
  <text x="${w * 0.95}" y="${h - Math.round(h * 0.032)}" text-anchor="end" font-family="Helvetica, sans-serif" font-weight="bold" font-size="${Math.round(w * 0.022)}" fill="#16181D">TRU</text>
  <text x="${cx}" y="${h - Math.round(h * 0.032)}" text-anchor="middle" font-family="Helvetica, sans-serif" font-size="${Math.round(w * 0.014)}" fill="#9AA0AE">MOCK PREVIEW — real generation uses gpt-image-1</text>
</svg>`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
