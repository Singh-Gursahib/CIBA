import "server-only";
import puppeteer from "puppeteer";
import type { ProposalMeta } from "@/types/grants";
import { proposalHtml } from "./html";

/** Render a proposal to a print-quality A4 PDF via headless Chromium. */
export async function proposalPdf(meta: ProposalMeta, markdown: string): Promise<Buffer> {
  const html = proposalHtml(meta, markdown);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="width:100%; font-size:8pt; color:#9aa0ae; padding:0 20mm; display:flex; justify-content:space-between;">
          <span>CIBA · Central Interior Business Accelerator</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>`,
      margin: { top: "20mm", bottom: "18mm", left: "20mm", right: "20mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
