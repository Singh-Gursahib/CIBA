"use client";

import { useState } from "react";
import { ImageIcon, Clapperboard } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { PosterComposer } from "./poster-composer";
import { VideoPanel } from "./video-panel";
import { JobHistory } from "./job-history";
import type { MarketingJob } from "@/types/marketing";

export function MarketingView({ jobs }: { jobs: MarketingJob[] }) {
  const [tab, setTab] = useState<"posters" | "video">("posters");
  const [selectedJob, setSelectedJob] = useState<MarketingJob | undefined>();

  return (
    <div className="space-y-8">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "posters", label: "Posters", icon: <ImageIcon className="size-3.5" /> },
          { value: "video", label: "Video", icon: <Clapperboard className="size-3.5" /> },
        ]}
      />

      {tab === "posters" ? (
        <PosterComposer key={selectedJob?.id ?? "new"} initialJob={selectedJob} />
      ) : (
        <VideoPanel />
      )}

      {tab === "posters" && (
        <JobHistory
          jobs={jobs.filter((j) => j.kind === "image")}
          selectedId={selectedJob?.id}
          onSelect={(job) => setSelectedJob(job)}
        />
      )}
    </div>
  );
}
