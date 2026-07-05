"use client";

import { create } from "zustand";
import { DOC_TYPE_META, type DocType } from "@/types/knowledge";

const ALL_KINDS = Object.keys(DOC_TYPE_META) as DocType[];

interface GraphState {
  query: string;
  enabledKinds: Set<DocType>;
  selectedId: string | null;
  hoverId: string | null;
  fitTick: number;
  setQuery: (q: string) => void;
  toggleKind: (k: DocType) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  requestFit: () => void;
}

export const useGraph = create<GraphState>((set) => ({
  query: "",
  enabledKinds: new Set(ALL_KINDS),
  selectedId: null,
  hoverId: null,
  fitTick: 0,
  setQuery: (query) => set({ query }),
  toggleKind: (k) =>
    set((s) => {
      const next = new Set(s.enabledKinds);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return { enabledKinds: next };
    }),
  select: (selectedId) => set({ selectedId }),
  hover: (hoverId) => set({ hoverId }),
  requestFit: () => set((s) => ({ fitTick: s.fitTick + 1 })),
}));
