"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MarketingJob } from "@/types/marketing";
import type { VideoPollResult } from "@/lib/video/provider";

interface JobPollResponse {
  job: MarketingJob;
  video?: VideoPollResult;
}

/** Polls a marketing job while it is queued/generating; stops when settled. */
export function useJobPolling(intervalMs = 1500) {
  const [job, setJob] = useState<MarketingJob | null>(null);
  const [video, setVideo] = useState<VideoPollResult | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const track = useCallback(
    (jobId: string) => {
      stop();
      const tick = async () => {
        try {
          const res = await fetch(`/api/marketing/jobs/${jobId}`, { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as JobPollResponse;
          setJob(data.job);
          setVideo(data.video ?? null);
          if (data.job.status === "ready" || data.job.status === "failed") stop();
        } catch {
          // transient network error: keep polling
        }
      };
      void tick();
      timer.current = setInterval(tick, intervalMs);
    },
    [intervalMs, stop]
  );

  useEffect(() => stop, [stop]);

  return { job, video, track, setJob, stop };
}
