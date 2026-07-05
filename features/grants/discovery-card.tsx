"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  ExternalLink,
  Star,
  X,
  ChevronDown,
  FileText,
  CalendarClock,
  CircleDollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setDiscoveryStatus } from "./actions";
import { useToast } from "@/components/ui/toast";
import type { Discovery, FitAnalysis, FundingOrg } from "@/types/grants";
import { cn } from "@/lib/utils/cn";

export function DiscoveryCard({
  discovery,
  org,
  onStartProposal,
}: {
  discovery: Discovery;
  org?: FundingOrg;
  onStartProposal: (d: Discovery) => void;
}) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [fit, setFit] = useState<FitAnalysis | undefined>(discovery.fit);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(discovery.status === "dismissed");

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/grants/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discoveryId: discovery.id }),
      });
      const data = await res.json();
      if (data.fit) {
        setFit(data.fit);
        setExpanded(true);
      } else toast("error", "Analysis failed");
    } catch {
      toast("error", "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const deadline = formatDeadline(discovery.deadline);

  if (dismissed) return null;

  return (
    <Card className={cn("overflow-hidden", discovery.status === "new" && "ring-1 ring-amber/30")}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              {discovery.status === "new" && <Badge tone="amber">New</Badge>}
              {org && <Badge tone="neutral">{org.name.split(" (")[0]}</Badge>}
              {discovery.status === "shortlisted" && <Badge tone="river">Shortlisted</Badge>}
              {discovery.status === "proposal_started" && <Badge tone="sage">Proposal started</Badge>}
            </div>
            <h3 className="text-[15px] font-semibold text-ink">{discovery.title}</h3>
          </div>
          {fit && <FitDial score={fit.score} />}
        </div>

        <p className="mt-2 text-[13.5px] text-ink-soft">{discovery.summary}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-faint">
          {deadline && (
            <span className={cn("flex items-center gap-1", deadline.urgent && "text-clay")}>
              <CalendarClock className="size-3.5" /> {deadline.label}
            </span>
          )}
          {discovery.amount && (
            <span className="flex items-center gap-1">
              <CircleDollarSign className="size-3.5" /> {discovery.amount}
            </span>
          )}
          {discovery.url && (
            <a
              href={discovery.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-river hover:underline"
            >
              <ExternalLink className="size-3.5" /> Source
            </a>
          )}
        </div>

        {fit && expanded && <FitDetails fit={fit} />}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!fit ? (
            <Button size="sm" onClick={analyze} loading={analyzing} icon={<Sparkles className="size-3.5" />}>
              Analyze fit
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => onStartProposal({ ...discovery, fit })}
                icon={<FileText className="size-3.5" />}
              >
                Start proposal
              </Button>
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
              >
                {expanded ? "Hide" : "Show"} analysis
                <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
              </button>
            </>
          )}
          {discovery.status !== "shortlisted" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startTransition(() => setDiscoveryStatus(discovery.id, "shortlisted"))}
              icon={<Star className="size-3.5" />}
            >
              Shortlist
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDismissed(true);
              startTransition(() => setDiscoveryStatus(discovery.id, "dismissed"));
            }}
            icon={<X className="size-3.5" />}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </Card>
  );
}

function FitDial({ score }: { score: number }) {
  const tone = score >= 70 ? "#14655F" : score >= 40 ? "#C97B22" : "#B4552D";
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex size-12 shrink-0 items-center justify-center">
      <svg width={48} height={48} className="-rotate-90">
        <circle cx={24} cy={24} r={r} fill="none" stroke="var(--color-line)" strokeWidth={4} />
        <circle
          cx={24}
          cy={24}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (score / 100) * c}
        />
      </svg>
      <span className="absolute text-[13px] font-semibold" style={{ color: tone }}>
        {score}
      </span>
    </div>
  );
}

function FitDetails({ fit }: { fit: FitAnalysis }) {
  return (
    <div className="mt-3 space-y-3 rounded-md border border-line bg-surface-tint/50 p-3.5 text-[13px] animate-fade-in">
      <p className="text-ink-soft">{fit.rationale}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-semibold text-river">Strengths</p>
          <ul className="space-y-1">
            {fit.strengths.map((s, i) => (
              <li key={i} className="flex gap-1.5 text-ink-soft">
                <span className="text-river">+</span> {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-amber">To clarify</p>
          <ul className="space-y-1">
            {fit.gaps.map((g, i) => (
              <li key={i} className="flex gap-1.5 text-ink-soft">
                <span className="text-amber">•</span> {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {fit.relatedDocs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
          <span className="text-xs text-ink-faint">Based on:</span>
          {fit.relatedDocs.map((d) => (
            <a
              key={d.slug}
              href={`/knowledge/docs/${d.slug}`}
              className="rounded-full bg-river-tint px-2 py-0.5 text-[11.5px] font-medium text-river-deep hover:bg-river/15"
            >
              {d.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDeadline(deadline?: string): { label: string; urgent: boolean } | null {
  if (!deadline) return null;
  const parsed = Date.parse(deadline);
  if (Number.isNaN(parsed)) return { label: deadline, urgent: false };
  const days = Math.ceil((parsed - Date.now()) / 86_400_000);
  if (days < 0) return { label: "Closed", urgent: false };
  if (days === 0) return { label: "Closes today", urgent: true };
  return { label: `Closes in ${days} day${days === 1 ? "" : "s"}`, urgent: days < 14 };
}
