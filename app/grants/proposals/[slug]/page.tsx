import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProposalWorkspace } from "@/features/proposals/proposal-workspace";
import { readProposalDoc, getProposalMeta } from "@/features/grants/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getProposalMeta(slug);
  return { title: meta?.title ?? "Proposal" };
}

export default async function ProposalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [markdown, meta] = await Promise.all([readProposalDoc(slug), getProposalMeta(slug)]);
  if (!markdown || !meta) notFound();

  return <ProposalWorkspace meta={meta} initialMarkdown={markdown} />;
}
