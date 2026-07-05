"use client";

import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { Spinner, Skeleton } from "@/components/ui/spinner";
import { Kbd } from "@/components/ui/kbd";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout/page-header";

export default function StyleguidePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState<"one" | "two">("one");
  const toast = useToast();

  return (
    <div className="enter space-y-10">
      <PageHeader title="Styleguide" description="Internal reference for every UI primitive. Not linked in navigation." />

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button icon={<Plus className="size-4" />}>With icon</Button>
          <Button size="sm" variant="secondary" icon={<Download className="size-3.5" />}>Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="river">River</Badge>
          <Badge tone="amber">Amber</Badge>
          <Badge tone="clay">Clay</Badge>
          <Badge tone="sage">Sage</Badge>
        </div>
      </Section>

      <Section title="Form fields">
        <div className="grid max-w-md gap-4">
          <div>
            <Label htmlFor="sg-input">Event name</Label>
            <Input id="sg-input" placeholder="Kamloops Pitch Night 2026" />
            <FieldHint>Shown as the poster headline.</FieldHint>
          </div>
          <div>
            <Label htmlFor="sg-textarea">Brief</Label>
            <Textarea id="sg-textarea" placeholder="Describe the event or announcement…" />
          </div>
        </div>
      </Section>

      <Section title="Tabs, dialog, toast">
        <div className="flex flex-wrap items-center gap-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "one", label: "Posters" },
              { value: "two", label: "Video" },
            ]}
          />
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button variant="secondary" onClick={() => toast("success", "Poster saved to library")}>Success toast</Button>
          <Button variant="secondary" onClick={() => toast("error", "Generation failed, try again")}>Error toast</Button>
        </div>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Example dialog">
          <p className="text-sm text-ink-soft">Dialogs use the native element with a blurred backdrop.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
          </div>
        </Dialog>
      </Section>

      <Section title="Progress & loading">
        <div className="flex flex-wrap items-center gap-8">
          <div className="w-56 space-y-3">
            <ProgressBar value={35} />
            <ProgressBar value={80} />
          </div>
          <ProgressRing value={65} />
          <Spinner />
          <div className="w-40 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Kbd>⌘K</Kbd>
        </div>
      </Section>

      <Section title="Cards & empty state">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Card title</CardTitle></CardHeader>
            <CardBody><p className="text-sm text-ink-soft">Surface, hairline border, soft shadow.</p></CardBody>
          </Card>
          <EmptyState
            icon={<Plus />}
            title="Nothing here yet"
            description="Empty states invite the first action."
            action={<Button size="sm">Create one</Button>}
          />
        </div>
      </Section>

      <Section title="Type & color">
        <div className="space-y-2">
          <p className="font-display text-4xl">Instrument Serif — display</p>
          <p className="text-base">Instrument Sans — interface and body copy</p>
          <p className="font-mono text-sm">IBM Plex Mono — logs and timestamps</p>
        </div>
        <div className="mt-4 flex gap-2">
          {["paper", "surface-tint", "line", "river", "river-tint", "amber", "clay", "sage", "ink"].map((c) => (
            <div key={c} className="text-center">
              <div
                className="size-12 rounded-md border border-line"
                style={{ background: `var(--color-${c})` }}
              />
              <span className="mt-1 block font-mono text-[10px] text-ink-faint">{c}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 border-b border-line pb-2 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
