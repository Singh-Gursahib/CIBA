import { currentMember } from "@/lib/os/auth";
import { listDocs } from "@/lib/os/knowledge/search";
import { KnowledgeView } from "./knowledge-view";

export default async function KnowledgePage() {
  await currentMember(); // layout guarantees sign-in; the KB is org-wide
  const docs = listDocs().map(({ slug, title, type, tags, summary, updated }) => ({ slug, title, type, tags, summary, updated }));
  return <KnowledgeView docs={docs} />;
}
