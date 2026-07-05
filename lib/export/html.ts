import "server-only";
import { marked } from "marked";
import type { ProposalMeta } from "@/types/grants";
import { friendlyDate } from "@/lib/utils/dates";

/** Build a fully self-contained, print-ready HTML document for a proposal. */
export function proposalHtml(meta: ProposalMeta, markdown: string): string {
  const body = marked.parse(markdown, { async: false }) as string;
  const today = friendlyDate(new Date().toISOString());

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #16181d; font-size: 11pt; line-height: 1.6; margin: 0;
  }
  .cover {
    height: 250mm; display: flex; flex-direction: column; justify-content: center;
    page-break-after: always; text-align: left;
  }
  .cover .eyebrow { color: #c97b22; letter-spacing: 3px; font-size: 11pt; font-weight: 700; text-transform: uppercase; }
  .cover h1 { font-family: Georgia, "Times New Roman", serif; font-size: 34pt; line-height: 1.15; color: #14655f; margin: 14pt 0 6pt; font-weight: 400; }
  .cover .grant { font-size: 13pt; color: #5a6070; margin-bottom: 40pt; }
  .cover .meta { border-top: 2px solid #14655f; padding-top: 12pt; font-size: 10pt; color: #5a6070; }
  .cover .brand { margin-top: 6pt; font-weight: 700; color: #16181d; }
  h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; color: #14655f; font-weight: 400; page-break-after: avoid; }
  h1 { font-size: 20pt; margin: 0 0 8pt; }
  h2 { font-size: 15pt; margin: 20pt 0 6pt; border-bottom: 1px solid #e8e6e1; padding-bottom: 4pt; }
  h3 { font-size: 12.5pt; margin: 14pt 0 4pt; color: #16181d; }
  p { margin: 6pt 0; }
  ul, ol { margin: 6pt 0; padding-left: 18pt; }
  li { margin: 3pt 0; }
  blockquote { border-left: 2px solid #14655f; margin: 8pt 0; padding-left: 12pt; color: #5a6070; font-style: italic; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 10pt; page-break-inside: avoid; }
  th, td { border: 1px solid #d6d3cc; padding: 5pt 8pt; text-align: left; }
  th { background: #f4f2ee; }
  code { font-family: "SF Mono", Menlo, monospace; font-size: 9.5pt; background: #f4f2ee; padding: 1pt 3pt; border-radius: 3px; }
  .content h1:first-of-type { display: none; } /* title already on cover */
</style>
</head>
<body>
  <div class="cover">
    <div class="eyebrow">CIBA Grant Proposal</div>
    <h1>${escapeHtml(meta.title)}</h1>
    <div class="grant">${escapeHtml([meta.grantTitle, meta.orgName].filter(Boolean).join(" · "))}</div>
    <div class="meta">
      <div class="brand">Central Interior Business Accelerator</div>
      <div>In partnership with Thompson Rivers University · Kamloops, British Columbia</div>
      <div>Prepared ${today}</div>
    </div>
  </div>
  <div class="content">${body}</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
