"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Wand2, FileText } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import type { Discovery, IntakeQuestion } from "@/types/grants";

type Phase = "loading" | "questions" | "generating" | "done";

export function ProposalFlow({
  discovery,
  onClose,
}: {
  discovery: Discovery;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<IntakeQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/proposals/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discoveryId: discovery.id }),
    })
      .then((r) => r.json())
      .then((d) => {
        setQuestions(d.questions ?? []);
        setPhase("questions");
      })
      .catch(() => {
        toast("error", "Could not load questions");
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = questions[step];
  const isLast = step === questions.length - 1;
  const answered = current ? (answers[current.question] ?? "").trim().length > 0 : false;

  const generate = async () => {
    setPhase("generating");
    try {
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discoveryId: discovery.id, answers }),
      });
      const data = await res.json();
      if (data.slug) {
        setSlug(data.slug);
        setPhase("done");
        toast("success", "Proposal generated");
        router.refresh();
      } else {
        toast("error", "Generation failed");
        setPhase("questions");
      }
    } catch {
      toast("error", "Generation failed");
      setPhase("questions");
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={phase === "done" ? "Proposal ready" : "New proposal"}
      className="w-[min(94vw,620px)]"
    >
      {phase === "loading" && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Spinner className="size-5 text-river" />
          <p className="text-sm text-ink-soft">Preparing questions for this grant…</p>
        </div>
      )}

      {phase === "questions" && current && (
        <div>
          <div className="mb-4 flex items-center gap-1.5">
            {questions.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-river" : "bg-line"}`}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-ink-faint">
            {discovery.title} · Question {step + 1} of {questions.length}
          </p>
          <h3 className="mt-1.5 font-display text-xl leading-snug">{current.question}</h3>
          {current.hint && <p className="mt-1 text-[13px] text-ink-soft">{current.hint}</p>}

          <div className="mt-4">
            {current.inputType === "textarea" ? (
              <Textarea
                autoFocus
                value={answers[current.question] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [current.question]: e.target.value }))}
                placeholder="Your answer…"
                className="min-h-28"
              />
            ) : (
              <Input
                autoFocus
                value={answers[current.question] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [current.question]: e.target.value }))}
                placeholder="Your answer…"
              />
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              icon={<ArrowLeft className="size-3.5" />}
            >
              Back
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-faint">You can skip and refine later</span>
              {isLast ? (
                <Button onClick={generate} icon={<Wand2 className="size-4" />}>
                  Generate proposal
                </Button>
              ) : (
                <Button onClick={() => setStep((s) => s + 1)} icon={<ArrowRight className="size-4" />}>
                  {answered ? "Next" : "Skip"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {phase === "generating" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="size-6 animate-spin text-river" />
          <p className="text-sm font-medium text-ink">Writing your proposal…</p>
          <p className="text-[13px] text-ink-soft">Drafting all sections from your answers and CIBA&apos;s history.</p>
        </div>
      )}

      {phase === "done" && slug && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-river-tint text-river">
            <FileText className="size-6" />
          </div>
          <div>
            <p className="font-medium text-ink">Your proposal draft is ready</p>
            <p className="mt-1 text-[13px] text-ink-soft">
              Open it to review. A full editor with AI rewriting and PDF export arrives in Phase 5.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => router.push(`/grants/proposals/${slug}`)} icon={<FileText className="size-4" />}>
              Open proposal
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
