import { proposalPdf } from "@/lib/export/pdf";
import { getProposalMeta, readProposalDoc, snapshotProposal, upsertProposalMeta } from "@/features/grants/data";
import { slugify } from "@/lib/utils/slugify";

export const maxDuration = 120;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [meta, markdown] = await Promise.all([getProposalMeta(slug), readProposalDoc(slug)]);
  if (!meta || !markdown) return new Response("Not found", { status: 404 });

  await snapshotProposal(slug);
  const pdf = await proposalPdf(meta, markdown);
  if (meta.status !== "exported") await upsertProposalMeta({ ...meta, status: "exported" });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="CIBA-${slugify(meta.title)}.pdf"`,
    },
  });
}
