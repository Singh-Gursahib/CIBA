// Mutable overlay on top of the immutable seed.
// The OS ships with static seed arrays (src/lib/os/seed.ts) so the demo always
// has a rich starting state. This module is what makes the OS *operable*: every
// entity a signed-in member creates (ventures, funding records, documents, new
// collaborations, activity) is persisted here to .data/os-overlay.json and
// merged into the scoped reads in store.ts — so a new venture instantly shows up
// in the portfolio, the impact rollup, the project page, and the brain map.
//
// Reads are synchronous (readFileSync) so store.ts can stay synchronous and
// every page keeps rendering without an async data layer; writes are rare
// (a human filling a form) and go through an atomic rename. .data/ is gitignored.

import fs from "node:fs";
import path from "node:path";
import type { ActivityEvent, Doc, FundingRecord, Partner, Project, Venture } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "os-overlay.json");

export type Overlay = {
  partners: Partner[];
  projects: Project[];
  funding: FundingRecord[];
  ventures: Venture[];
  docs: Doc[];
  activity: ActivityEvent[];
};

const EMPTY: Overlay = { partners: [], projects: [], funding: [], ventures: [], docs: [], activity: [] };

export function readOverlay(): Overlay {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<Overlay>;
    return { ...EMPTY, ...parsed };
  } catch {
    return { ...EMPTY, partners: [], projects: [], funding: [], ventures: [], docs: [], activity: [] };
  }
}

function writeOverlay(next: Overlay): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2));
  fs.renameSync(tmp, FILE);
}

// --- typed appenders (used by the create API) ---
export const overlayPartners = (): Partner[] => readOverlay().partners;
export const overlayProjects = (): Project[] => readOverlay().projects;
export const overlayFunding = (): FundingRecord[] => readOverlay().funding;
export const overlayVentures = (): Venture[] => readOverlay().ventures;
export const overlayDocs = (): Doc[] => readOverlay().docs;
export const overlayActivity = (): ActivityEvent[] => readOverlay().activity;

export function addPartner(p: Partner): void {
  const o = readOverlay();
  o.partners.push(p);
  writeOverlay(o);
}
export function addProject(p: Project): void {
  const o = readOverlay();
  o.projects.push(p);
  writeOverlay(o);
}
export function addFunding(f: FundingRecord): void {
  const o = readOverlay();
  o.funding.push(f);
  writeOverlay(o);
}
export function addVenture(v: Venture): void {
  const o = readOverlay();
  o.ventures.push(v);
  writeOverlay(o);
}
export function addDoc(d: Doc): void {
  const o = readOverlay();
  o.docs.push(d);
  writeOverlay(o);
}
export function logActivity(ev: ActivityEvent): void {
  const o = readOverlay();
  o.activity.unshift(ev);
  writeOverlay(o);
}
