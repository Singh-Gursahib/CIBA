import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDoc } from "@/lib/content/loader";
import { getLinks } from "@/lib/content/graph";
import { listDocMeta } from "@/lib/content/data";
import { DocViewer } from "@/features/knowledge/doc-viewer";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc(slug);
  return { title: doc?.title ?? "Document" };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getDoc(slug);
  if (!doc) notFound();

  const [{ backlinks, outgoing }, docs] = await Promise.all([getLinks(slug), listDocMeta()]);
  const resolve = Object.fromEntries(docs.map((d) => [d.title.toLowerCase(), d.slug]));

  return (
    <div className="mx-auto max-w-4xl">
      <DocViewer doc={doc} backlinks={backlinks} outgoing={outgoing} resolve={resolve} />
    </div>
  );
}
