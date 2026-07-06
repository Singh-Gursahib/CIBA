"use client";

// The "operable" surface: an Add button that opens a modal form and POSTs to
// /api/os/entities, then refreshes the server component so the new record shows
// up in place. One component covers every creatable entity — the fields shown
// are driven by `type`. Permission is still enforced server-side; this just
// won't render for members who can't act (the caller decides that).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useToast } from "@/components/toast";

export type EntityType = "venture" | "funding" | "doc" | "project";
type ProjectOpt = { id: string; name: string };

const TITLES: Record<EntityType, string> = {
  venture: "Add venture",
  funding: "Log funding",
  doc: "Add document",
  project: "New collaboration",
};

export function AddEntity({
  type,
  projects = [],
  defaultProjectId,
  label,
  size = "md",
}: {
  type: EntityType;
  projects?: ProjectOpt[];
  /** Prefills + hides the collaboration picker (used on a project page). */
  defaultProjectId?: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function submit(form: FormData) {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { type };
      form.forEach((v, k) => {
        payload[k] = v === "on" ? true : v;
      });
      if (defaultProjectId) payload.projectId = defaultProjectId;
      const res = await fetch("/api/os/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save.");
      toast("success", `${TITLES[type]} — saved`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const needsProject = type !== "project" && !defaultProjectId;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn btn-primary ${size === "sm" ? "!py-1.5 !px-3 text-xs" : "text-sm"}`}
      >
        <Plus className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        {label ?? TITLES[type]}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{TITLES[type]}</h2>
              <button onClick={() => setOpen(false)} disabled={busy} className="text-muted hover:text-ink" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={submit}
              className="space-y-4"
            >
              {needsProject && (
                <div>
                  <label className="label">Collaboration</label>
                  <select name="projectId" required className="field" defaultValue="">
                    <option value="" disabled>Choose a collaboration…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {type === "venture" && <VentureFields />}
              {type === "funding" && <FundingFields />}
              {type === "doc" && <DocFields />}
              {type === "project" && <ProjectFields />}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn btn-ghost text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn btn-primary text-sm">
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function VentureFields() {
  return (
    <>
      <div>
        <label className="label">Venture name</label>
        <input name="name" required className="field" placeholder="e.g. Aurora Robotics" />
      </div>
      <Row>
        <div>
          <label className="label">Founder</label>
          <input name="founder" className="field" placeholder="Founder name" />
        </div>
        <div>
          <label className="label">Sector</label>
          <input name="sector" className="field" placeholder="e.g. CleanTech" />
        </div>
      </Row>
      <div>
        <label className="label">Stage</label>
        <select name="stage" className="field" defaultValue="idea">
          <option value="idea">Idea</option>
          <option value="validation">Validation</option>
          <option value="growth">Growth</option>
          <option value="operating">Operating</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Jobs</label>
          <input name="jobs" type="number" min="0" className="field" defaultValue={0} />
        </div>
        <div>
          <label className="label">Revenue (CAD)</label>
          <input name="revenueCAD" type="number" min="0" className="field" defaultValue={0} />
        </div>
        <div>
          <label className="label">Raised (CAD)</label>
          <input name="raisedCAD" type="number" min="0" className="field" defaultValue={0} />
        </div>
      </div>
    </>
  );
}

function FundingFields() {
  return (
    <>
      <div>
        <label className="label">Source</label>
        <input name="source" required className="field" placeholder="e.g. Innovate BC" />
      </div>
      <Row>
        <div>
          <label className="label">Kind</label>
          <select name="kind" className="field" defaultValue="grant">
            <option value="grant">Grant</option>
            <option value="sponsorship">Sponsorship</option>
            <option value="program-delivery">Program delivery</option>
            <option value="co-investment">Co-investment</option>
          </select>
        </div>
        <div>
          <label className="label">Amount (CAD)</label>
          <input name="amountCAD" type="number" min="0" className="field" defaultValue={0} />
        </div>
      </Row>
      <Row>
        <div>
          <label className="label">Status</label>
          <select name="status" className="field" defaultValue="applied">
            <option value="received">Received</option>
            <option value="committed">Committed</option>
            <option value="applied">Applied</option>
            <option value="reporting-due">Reporting due</option>
          </select>
        </div>
        <div>
          <label className="label">Report deadline</label>
          <input name="reportDeadline" type="date" className="field" />
        </div>
      </Row>
      <div>
        <label className="label">Notes</label>
        <input name="notes" className="field" placeholder="Optional context" />
      </div>
    </>
  );
}

function DocFields() {
  return (
    <>
      <div>
        <label className="label">Document name</label>
        <input name="name" required className="field" placeholder="e.g. Q3 Funder Report.pdf" />
      </div>
      <Row>
        <div>
          <label className="label">Type</label>
          <select name="docType" className="field" defaultValue="report">
            <option value="agreement">Agreement</option>
            <option value="report">Report</option>
            <option value="deck">Deck</option>
            <option value="budget">Budget</option>
            <option value="notes">Notes</option>
            <option value="application">Application</option>
          </select>
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input name="sensitive" type="checkbox" className="w-4 h-4" />
            Sensitive
          </label>
        </div>
      </Row>
    </>
  );
}

function ProjectFields() {
  return (
    <>
      <div>
        <label className="label">Collaboration name</label>
        <input name="name" required className="field" placeholder="e.g. Regional AI Pilot" />
      </div>
      <Row>
        <div>
          <label className="label">Program tag</label>
          <input name="programTag" className="field" placeholder="e.g. PacifiCan" />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" className="field" defaultValue="planning">
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="wrapped">Wrapped</option>
          </select>
        </div>
      </Row>
      <div>
        <label className="label">Summary</label>
        <textarea name="summary" className="field" rows={3} placeholder="What this collaboration is about" />
      </div>
    </>
  );
}
