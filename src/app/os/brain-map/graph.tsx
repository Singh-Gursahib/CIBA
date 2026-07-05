"use client";

// Live force-directed brain map. Hand-rolled simulation (repulsion + springs
// + centering) running on rAF — nodes are draggable, hover highlights the
// neighborhood, click opens a detail panel.

import { useEffect, useMemo, useRef, useState } from "react";
import type { GraphLink, GraphNode } from "@/lib/os/store";

type SimNode = GraphNode & { x: number; y: number; vx: number; vy: number; fixed?: boolean };

const COLORS: Record<GraphNode["type"], string> = {
  org: "#0a3f33",
  project: "#0f5c4a",
  partner: "#7c3aed",
  member: "#2563eb",
  integration: "#e07a2f",
  venture: "#b23b3b",
};

const RADII: Record<GraphNode["type"], number> = {
  org: 26,
  project: 16,
  partner: 12,
  member: 11,
  integration: 10,
  venture: 9,
};

const TYPE_LABEL: Record<GraphNode["type"], string> = {
  org: "Organization",
  project: "Collaboration",
  partner: "Partner",
  member: "Team member",
  integration: "Integration",
  venture: "Venture",
};

export function BrainMapGraph({ nodes, links }: { nodes: GraphNode[]; links: GraphLink[] }) {
  const W = 900;
  const H = 620;
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<SimNode[]>([]);
  const dragRef = useRef<string | null>(null);
  const [, force] = useState(0);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // adjacency for hover highlighting
  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const l of links) {
      if (!map.has(l.source)) map.set(l.source, new Set());
      if (!map.has(l.target)) map.set(l.target, new Set());
      map.get(l.source)!.add(l.target);
      map.get(l.target)!.add(l.source);
    }
    return map;
  }, [links]);

  // init sim nodes in a circle (deterministic — no Math.random)
  useEffect(() => {
    simRef.current = nodes.map((n, i) => {
      if (n.id === "ciba") return { ...n, x: W / 2, y: H / 2, vx: 0, vy: 0 };
      const angle = (i / nodes.length) * Math.PI * 2;
      const r = 150 + (i % 5) * 40;
      return { ...n, x: W / 2 + Math.cos(angle) * r, y: H / 2 + Math.sin(angle) * r, vx: 0, vy: 0 };
    });

    let raf = 0;
    const tick = () => {
      const sim = simRef.current;
      const byId = new Map(sim.map((n) => [n.id, n]));

      // repulsion
      for (let i = 0; i < sim.length; i++) {
        for (let j = i + 1; j < sim.length; j++) {
          const a = sim[i];
          const b = sim[j];
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          const d2 = Math.max(dx * dx + dy * dy, 64);
          const d = Math.sqrt(d2);
          const f = 2400 / d2;
          dx /= d;
          dy /= d;
          a.vx += dx * f;
          a.vy += dy * f;
          b.vx -= dx * f;
          b.vy -= dy * f;
        }
      }
      // springs
      for (const l of links) {
        const a = byId.get(l.source);
        const b = byId.get(l.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const rest = a.id === "ciba" || b.id === "ciba" ? 150 : 85;
        const f = (d - rest) * 0.012;
        a.vx += (dx / d) * f;
        a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f;
        b.vy -= (dy / d) * f;
      }
      // centering + integrate
      for (const n of sim) {
        n.vx += (W / 2 - n.x) * 0.0012;
        n.vy += (H / 2 - n.y) * 0.0012;
        if (!n.fixed) {
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x = Math.min(W - 20, Math.max(20, n.x + n.vx));
          n.y = Math.min(H - 20, Math.max(20, n.y + n.vy));
        } else {
          n.vx = 0;
          n.vy = 0;
        }
      }
      force((v) => v + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [nodes, links]);

  function svgPoint(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  const sim = simRef.current;
  const byId = new Map(sim.map((n) => [n.id, n]));
  const dim = (id: string) =>
    hovered !== null && id !== hovered && !(neighbors.get(hovered)?.has(id) ?? false);

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-5 items-start">
      <div className="card overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none select-none"
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            const p = svgPoint(e);
            const n = byId.get(dragRef.current);
            if (n) {
              n.x = p.x;
              n.y = p.y;
              n.fixed = true;
            }
          }}
          onPointerUp={() => {
            const n = dragRef.current ? byId.get(dragRef.current) : null;
            if (n) n.fixed = false;
            dragRef.current = null;
          }}
          onPointerLeave={() => {
            const n = dragRef.current ? byId.get(dragRef.current) : null;
            if (n) n.fixed = false;
            dragRef.current = null;
          }}
        >
          {/* links */}
          {links.map((l, i) => {
            const a = byId.get(l.source);
            const b = byId.get(l.target);
            if (!a || !b) return null;
            const faded = (hovered && l.source !== hovered && l.target !== hovered) || false;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={faded ? "#e3e7e2" : "#b9c6bf"}
                strokeWidth={faded ? 1 : 1.5}
              />
            );
          })}
          {/* nodes */}
          {sim.map((n) => (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              opacity={dim(n.id) ? 0.25 : 1}
              className="cursor-pointer"
              onPointerDown={(e) => {
                e.preventDefault();
                dragRef.current = n.id;
              }}
              onPointerEnter={() => setHovered(n.id)}
              onPointerLeave={() => setHovered(null)}
              onClick={() => setSelected(n)}
            >
              <circle
                r={RADII[n.type]}
                fill={COLORS[n.type]}
                stroke={selected?.id === n.id ? "#e07a2f" : "#fff"}
                strokeWidth={selected?.id === n.id ? 3 : 1.5}
              />
              <text
                y={RADII[n.type] + 12}
                textAnchor="middle"
                fontSize={n.type === "org" ? 13 : 10}
                fontWeight={n.type === "org" || n.type === "project" ? 700 : 500}
                fill="#14201c"
              >
                {n.label.length > 24 ? n.label.slice(0, 23) + "…" : n.label}
              </text>
            </g>
          ))}
        </svg>
        <div className="px-4 py-3 border-t border-line flex flex-wrap gap-x-4 gap-y-1.5">
          {(Object.keys(COLORS) as GraphNode["type"][]).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS[t] }} />
              {TYPE_LABEL[t]}
            </span>
          ))}
        </div>
      </div>

      {/* detail panel */}
      <div className="card p-5 lg:sticky lg:top-24">
        {selected ? (
          <div className="fade-up">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ background: COLORS[selected.type] }}
            >
              {TYPE_LABEL[selected.type]}
            </span>
            <h3 className="mt-2 font-bold">{selected.label}</h3>
            {selected.meta && <p className="text-sm text-muted mt-1">{selected.meta}</p>}
            <div className="mt-4 pt-3 border-t border-line">
              <p className="label">Connected to</p>
              <ul className="space-y-1">
                {[...(neighbors.get(selected.id) ?? [])].map((id) => {
                  const n = byId.get(id);
                  return n ? (
                    <li key={id} className="text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: COLORS[n.type] }} />
                      {n.label}
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted py-6">
            <p className="text-2xl">◉</p>
            <p className="text-sm mt-2">Click any node to inspect it.</p>
            <p className="text-xs mt-1">Drag nodes to rearrange — the map is live.</p>
          </div>
        )}
      </div>
    </div>
  );
}
