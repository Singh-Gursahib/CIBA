import "server-only";
import { marked, type Token, type Tokens } from "marked";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import type { ProposalMeta } from "@/types/grants";
import { friendlyDate } from "@/lib/utils/dates";

const RIVER = "14655F";
const AMBER = "C97B22";
const INK = "16181D";
const LINE = "D6D3CC";

/** Convert marked inline tokens to docx TextRuns, preserving bold/italic/code. */
function inlineRuns(tokens: Token[] | undefined, base: { bold?: boolean; italics?: boolean } = {}): TextRun[] {
  if (!tokens) return [];
  const runs: TextRun[] = [];
  for (const t of tokens) {
    if (t.type === "strong") runs.push(...inlineRuns((t as Tokens.Strong).tokens, { ...base, bold: true }));
    else if (t.type === "em") runs.push(...inlineRuns((t as Tokens.Em).tokens, { ...base, italics: true }));
    else if (t.type === "codespan")
      runs.push(new TextRun({ text: (t as Tokens.Codespan).text, font: "Consolas", ...base }));
    else if (t.type === "link") runs.push(...inlineRuns((t as Tokens.Link).tokens, base));
    else if ("text" in t) runs.push(new TextRun({ text: (t as Tokens.Text).text, ...base }));
  }
  return runs.length ? runs : [new TextRun({ text: "", ...base })];
}

function tableFromToken(t: Tokens.Table): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerRow = new TableRow({
    tableHeader: true,
    children: t.header.map(
      (cell) =>
        new TableCell({
          shading: { fill: "F4F2EE" },
          borders,
          children: [new Paragraph({ children: [new TextRun({ text: cell.text, bold: true })] })],
        })
    ),
  });
  const rows = t.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({ borders, children: [new Paragraph({ children: inlineRuns(cell.tokens) })] })
        ),
      })
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...rows] });
}

function blockToParagraphs(token: Token): (Paragraph | Table)[] {
  switch (token.type) {
    case "heading": {
      const h = token as Tokens.Heading;
      const level =
        h.depth === 1 ? HeadingLevel.HEADING_1 : h.depth === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
      return [new Paragraph({ heading: level, children: inlineRuns(h.tokens) })];
    }
    case "paragraph":
      return [new Paragraph({ children: inlineRuns((token as Tokens.Paragraph).tokens), spacing: { after: 120 } })];
    case "list": {
      const list = token as Tokens.List;
      return list.items.map(
        (item, i) =>
          new Paragraph({
            children: list.ordered
              ? [new TextRun({ text: `${(list.start || 1) + i}. `, bold: true }), ...inlineRuns(marked.lexer(item.text).flatMap((b) => ("tokens" in b ? (b as Tokens.Text).tokens ?? [] : [])))]
              : inlineRuns(marked.lexer(item.text).flatMap((b) => ("tokens" in b ? (b as Tokens.Text).tokens ?? [] : []))),
            bullet: list.ordered ? undefined : { level: 0 },
            indent: list.ordered ? { left: 360 } : undefined,
            spacing: { after: 40 },
          })
      );
    }
    case "blockquote":
      return [
        new Paragraph({
          children: inlineRuns(marked.lexer((token as Tokens.Blockquote).text).flatMap((b) => ("tokens" in b ? (b as Tokens.Text).tokens ?? [] : []))),
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: RIVER, space: 12 } },
          indent: { left: 240 },
          spacing: { after: 120 },
        }),
      ];
    case "table":
      return [tableFromToken(token as Tokens.Table), new Paragraph({ text: "", spacing: { after: 80 } })];
    case "code":
      return [new Paragraph({ children: [new TextRun({ text: (token as Tokens.Code).text, font: "Consolas", size: 18 })], shading: { fill: "F4F2EE" }, spacing: { after: 120 } })];
    case "hr":
      return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE } }, spacing: { after: 120 } })];
    case "space":
      return [];
    default:
      return "text" in token && (token as Tokens.Text).text
        ? [new Paragraph({ text: (token as Tokens.Text).text })]
        : [];
  }
}

/** Render a proposal to a Word .docx buffer. */
export async function proposalDocx(meta: ProposalMeta, markdown: string): Promise<Buffer> {
  const tokens = marked.lexer(markdown);
  // Drop a leading H1 (title lives in the cover block instead).
  if (tokens[0]?.type === "heading" && (tokens[0] as Tokens.Heading).depth === 1) tokens.shift();

  const bodyChildren = tokens.flatMap(blockToParagraphs);

  const cover: Paragraph[] = [
    new Paragraph({ spacing: { before: 2400 }, children: [new TextRun({ text: "CIBA GRANT PROPOSAL", color: AMBER, bold: true, size: 22, characterSpacing: 40 })] }),
    new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: meta.title, color: RIVER, size: 56, font: "Georgia" })] }),
    new Paragraph({ children: [new TextRun({ text: [meta.grantTitle, meta.orgName].filter(Boolean).join(" · "), color: "5A6070", size: 24 })] }),
    new Paragraph({
      spacing: { before: 600 },
      border: { top: { style: BorderStyle.SINGLE, size: 12, color: RIVER, space: 8 } },
      children: [new TextRun({ text: "Central Interior Business Accelerator", bold: true, color: INK, size: 20 })],
    }),
    new Paragraph({ children: [new TextRun({ text: "In partnership with Thompson Rivers University · Kamloops, British Columbia", color: "5A6070", size: 18 })] }),
    new Paragraph({ children: [new TextRun({ text: `Prepared ${friendlyDate(new Date().toISOString())}`, color: "5A6070", size: 18 })], pageBreakBefore: false }),
    new Paragraph({ text: "", pageBreakBefore: false, children: [new TextRun({ text: "", break: 1 })] }),
  ];

  const doc = new Document({
    creator: "CIBA OS",
    title: meta.title,
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22, color: INK } },
      },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: "Georgia", size: 36, color: RIVER, bold: false }, paragraph: { spacing: { before: 240, after: 120 } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: "Georgia", size: 28, color: RIVER, bold: false }, paragraph: { spacing: { before: 280, after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } } } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { font: "Georgia", size: 24, color: INK, bold: false }, paragraph: { spacing: { before: 200, after: 80 } } },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        children: [...cover, ...bodyChildren],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
