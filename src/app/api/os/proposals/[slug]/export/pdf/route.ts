import { currentMember } from "@/lib/os/auth";
import { canUseGrants } from "@/lib/os/grants/access";
import { getProposalMeta, readProposalDoc, touchProposal } from "@/lib/os/grants/store";
import { proposalPdf } from "@/lib/os/grants/pdf";

export const maxDuration = 120;

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const member = await currentMember();
  if (!member || !canUseGrants(member)) return new Response("Forbidden", { status: 403 });
  const { slug } = await ctx.params;
  const meta = await getProposalMeta(slug);
  const md = await readProposalDoc(slug);
  if (!meta || !md) return new Response("Not found", { status: 404 });

  const buffer = await proposalPdf(meta, md);
  await touchProposal(slug, { status: "exported" });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="CIBA-${slug}.pdf"`,
    },
  });
}
