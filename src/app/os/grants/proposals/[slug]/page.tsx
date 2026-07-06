import { notFound } from "next/navigation";
import { currentMember } from "@/lib/os/auth";
import { canUseGrants } from "@/lib/os/grants/access";
import { getProposalMeta, readProposalDoc } from "@/lib/os/grants/store";
import { ProposalEditor } from "./editor";

export default async function ProposalPage({ params }: { params: Promise<{ slug: string }> }) {
  const member = (await currentMember())!;
  if (!canUseGrants(member)) notFound();
  const { slug } = await params;
  const meta = await getProposalMeta(slug);
  const content = await readProposalDoc(slug);
  if (!meta) notFound();
  return <ProposalEditor slug={slug} meta={meta} initial={content} />;
}
