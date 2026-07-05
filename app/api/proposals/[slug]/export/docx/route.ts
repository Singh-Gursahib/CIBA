import { proposalDocx } from "@/lib/export/docx";
import { getProposalMeta, readProposalDoc, upsertProposalMeta } from "@/features/grants/data";
import { slugify } from "@/lib/utils/slugify";

export const maxDuration = 120;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [meta, markdown] = await Promise.all([getProposalMeta(slug), readProposalDoc(slug)]);
  if (!meta || !markdown) return new Response("Not found", { status: 404 });

  const docx = await proposalDocx(meta, markdown);
  if (meta.status !== "exported") await upsertProposalMeta({ ...meta, status: "exported" });

  return new Response(new Uint8Array(docx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="CIBA-${slugify(meta.title)}.docx"`,
    },
  });
}
