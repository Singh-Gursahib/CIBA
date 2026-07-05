"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { AssetUploader } from "./asset-uploader";
import { FormatPicker } from "./format-picker";
import { ResultsGallery } from "./results-gallery";
import { useJobPolling } from "./use-job";
import { createPosterJob } from "./actions";
import type { MarketingJob, OutputFormat } from "@/types/marketing";

export function PosterComposer({ initialJob }: { initialJob?: MarketingJob }) {
  const router = useRouter();
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [brief, setBrief] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDetails, setEventDetails] = useState("");
  const [cta, setCta] = useState("");
  const [formats, setFormats] = useState<OutputFormat[]>([]);
  const [submitting, startSubmit] = useTransition();
  const { job, track, setJob } = useJobPolling();

  const activeJob = job ?? initialJob ?? null;
  const generating = activeJob?.status === "queued" || activeJob?.status === "generating";
  const canSubmit = brief.trim().length > 0 && formats.length > 0 && !generating;

  const startGeneration = (jobId: string, regenerate?: OutputFormat[]) => {
    void fetch("/api/marketing/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, formats: regenerate }),
    }).then(() => router.refresh());
    track(jobId);
  };

  const submit = () => {
    startSubmit(async () => {
      const fd = new FormData();
      fd.set("brief", brief);
      fd.set("eventName", eventName);
      fd.set("eventDetails", eventDetails);
      fd.set("cta", cta);
      formats.forEach((f) => fd.append("formats", f));
      files.forEach((f) => fd.append("assets", f));

      const result = await createPosterJob(fd);
      if ("error" in result) {
        toast("error", result.error);
        return;
      }
      startGeneration(result.jobId);
    });
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_420px]">
      <Card>
        <CardHeader>
          <CardTitle>Create event posters</CardTitle>
        </CardHeader>
        <CardBody className="space-y-5">
          <div>
            <Label>Source assets</Label>
            <AssetUploader files={files} onChange={setFiles} disabled={generating} />
          </div>

          <div>
            <Label htmlFor="brief">Event or announcement</Label>
            <Textarea
              id="brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              maxLength={1200}
              disabled={generating}
              placeholder="A networking evening for Kamloops entrepreneurs featuring three local founders sharing how they landed their first customers…"
            />
            <FieldHint>{brief.length}/1200 · the more specific, the better the poster copy</FieldHint>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="eventName">Event name</Label>
              <Input
                id="eventName"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                disabled={generating}
                placeholder="Kamloops Pitch Night"
              />
            </div>
            <div>
              <Label htmlFor="eventDetails">Date, time & venue</Label>
              <Input
                id="eventDetails"
                value={eventDetails}
                onChange={(e) => setEventDetails(e.target.value)}
                disabled={generating}
                placeholder="Sept 18, 6 PM · TRU Grand Hall"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cta">Call to action</Label>
            <Input
              id="cta"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              disabled={generating}
              placeholder="Register at ciba.ca/pitch-night"
            />
          </div>

          <div>
            <Label>Output formats</Label>
            <FormatPicker selected={formats} onChange={setFormats} disabled={generating} />
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-[13px] text-ink-faint">
              {formats.length > 0
                ? `${formats.length} image${formats.length === 1 ? "" : "s"} will be generated`
                : "Choose at least one format"}
            </span>
            <Button
              onClick={submit}
              disabled={!canSubmit}
              loading={submitting || generating}
              icon={<Wand2 className="size-4" />}
            >
              {generating ? "Generating…" : "Generate posters"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Results</h2>
          {activeJob && (
            <Badge
              tone={
                activeJob.status === "ready"
                  ? "river"
                  : activeJob.status === "failed"
                    ? "clay"
                    : "amber"
              }
            >
              {activeJob.status}
            </Badge>
          )}
        </div>
        {activeJob ? (
          <>
            <ResultsGallery
              job={activeJob}
              onRegenerate={(format) => {
                setJob({
                  ...activeJob,
                  status: "generating",
                  outputs: activeJob.outputs.map((o) =>
                    o.format === format ? { ...o, status: "pending" as const } : o
                  ),
                });
                startGeneration(activeJob.id, [format]);
              }}
            />
            {activeJob.status === "failed" && activeJob.error && (
              <p className="text-xs text-clay">{activeJob.error}</p>
            )}
          </>
        ) : (
          <EmptyState
            icon={<ImageIcon />}
            title="Posters appear here"
            description="Describe your event, pick formats, and generate. Each format arrives as it finishes."
          />
        )}
      </div>
    </div>
  );
}
