import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { AssistantView } from "@/features/assistant/assistant-view";
import { listDocMeta } from "@/lib/content/data";

export const metadata: Metadata = { title: "Assistant" };
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const docs = await listDocMeta();

  return (
    <div className="enter flex h-full flex-col space-y-6">
      <PageHeader
        title="Assistant"
        description="Ask questions across the entire CIBA knowledge base. Answers cite the documents they draw from."
      />
      <AssistantView docs={docs} />
    </div>
  );
}
