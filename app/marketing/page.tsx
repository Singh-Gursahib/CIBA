import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { MarketingView } from "@/features/marketing/marketing-view";
import { listJobs } from "@/features/marketing/data";

export const metadata: Metadata = { title: "Marketing Studio" };
export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const jobs = await listJobs();

  return (
    <div className="enter space-y-8">
      <PageHeader
        title="Marketing Studio"
        description="Turn a short brief and a few assets into on-brand event posters and promotional video, sized for every channel."
      />
      <MarketingView jobs={jobs} />
    </div>
  );
}
