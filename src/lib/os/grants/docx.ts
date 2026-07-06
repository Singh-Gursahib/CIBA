// Markdown → Word (.docx). Self-contained (docx + marked), no native deps.

import { marked, type Token, type Tokens } from "marked";
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle } from "docx";
import type { ProposalMeta } from "./types";

const BRAND = "0F5C4A";
const INK = "14201C";
const LINE = "E3E7E2";

function para(text: string, opts: { bold?: boolean; italic?: boolean; size?: number; color?: string; before?: number } = {}): Paragraph {
  return new Paragraph({
    spacing: { before: opts.before ?? 0, after: 120 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italic, size: opts.size ?? 22, color: opts.color ?? INK, font: "Calibri" })],
  });
}

function tableFrom(t: Tokens.Table): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerRow = new TableRow({
    tableHeader: true,
    children: t.header.map((c) => new TableCell({ borders, shading: { fill: "F1F5F3" }, children: [para(c.text, { bold: true, size: 20 })] })),
  });
  const rows = t.rows.map((r) => new TableRow({ children: r.map((c) => new TableCell({ borders, children: [para(c.text, { size: 20 })] })) }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] });
}

export async function proposalDocx(meta: ProposalMeta, markdown: string): Promise<Buffer> {
  const tokens = marked.lexer(markdown);
  const children: (Paragraph | Table)[] = [];

  // Branded cover
  children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "CIBA", bold: true, size: 28, color: BRAND, font: "Calibri" })] }));
  children.push(para(meta.grantTitle ? `Grant proposal to ${meta.orgName}` : "Grant proposal", { color: "5C6B63", size: 20 }));
  children.push(new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND } }, children: [] }));

  let firstH1Skipped = false;
  for (const tok of tokens as Token[]) {
    switch (tok.type) {
      case "heading": {
        const h = tok as Tokens.Heading;
        if (h.depth === 1 && !firstH1Skipped) {
          firstH1Skipped = true;
          children.push(new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: h.text, bold: true, size: 40, color: INK, font: "Calibri" })] }));
        } else {
          children.push(
            new Paragraph({
              heading: h.depth <= 2 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
              spacing: { before: 240, after: 100 },
              children: [new TextRun({ text: h.text, bold: true, size: h.depth <= 2 ? 26 : 22, color: BRAND, font: "Calibri" })],
            }),
          );
        }
        break;
      }
      case "paragraph":
        children.push(para((tok as Tokens.Paragraph).text));
        break;
      case "list": {
        const l = tok as Tokens.List;
        l.items.forEach((it) =>
          children.push(new Paragraph({ bullet: l.ordered ? undefined : { level: 0 }, numbering: undefined, spacing: { after: 60 }, children: [new TextRun({ text: `${l.ordered ? "• " : ""}${it.text}`, size: 22, color: INK, font: "Calibri" })] })),
        );
        break;
      }
      case "table":
        children.push(tableFrom(tok as Tokens.Table));
        children.push(para("", { size: 8 }));
        break;
      case "blockquote":
        children.push(para((tok as Tokens.Blockquote).text, { italic: true, color: "5C6B63" }));
        break;
      case "hr":
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE } }, spacing: { after: 120 }, children: [] }));
        break;
      default:
        if ("text" in tok && (tok as { text?: string }).text) children.push(para(String((tok as { text: string }).text)));
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: INK } } } },
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}
